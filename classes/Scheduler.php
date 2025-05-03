<?php
class Scheduler {
	private static ?Scheduler $instance = null;

	const TASK_RC_EXCEPTION = -100;

	/** @var array<string, mixed> */
	private array $scheduled_tasks = [];

	public static function getInstance(): Scheduler {
		if (self::$instance == null)
			self::$instance = new self();

		return self::$instance;
	}

	/**
	 * Adds a backend scheduled task which will be executed by updater (if due) during housekeeping.
	 *
	 * The granularity is not strictly guaranteed, housekeeping is invoked several times per hour
	 * depending on how fast feed batch was processed, but no more than once per minute.
	 *
	 * Tasks do not run in user context. Task names may not overlap. Plugins should register tasks
	 * via PluginHost methods (to be implemented later).
	 *
	 * Tasks should return an integer value (return code) which is stored in the database, a value of
	 * 0 is considered successful.
	 *
	 * @param string $task_name unique name for this task, plugins should prefix this with plugin name
	 * @param string $cron_expression schedule for this task in cron format
	 * @param Closure $callback task code that gets executed
	*/
	function add_scheduled_task(string $task_name, string $cron_expression, Closure $callback) : bool {
		$task_name = strtolower($task_name);

		if (isset($this->scheduled_tasks[$task_name])) {
			user_error("Attempted to override already registered scheduled task $task_name", E_USER_WARNING);
			return false;
		} else {
			try {
				$cron = new Cron\CronExpression($cron_expression);
			} catch (InvalidArgumentException $e) {
				user_error("Attempt to register scheduled task $task_name failed: " . $e->getMessage(), E_USER_WARNING);
				return false;
			}

			$this->scheduled_tasks[$task_name] = [
				"cron" => $cron,
				"callback" => $callback,
			];
			return true;
		}
	}

	/**
	 * Execute scheduled tasks which are due to run and record last run timestamps.
	 */
	function run_due_tasks() : void {
		Debug::log('Processing all scheduled tasks...');

		$tasks_succeeded = 0;
		$tasks_failed = 0;

		foreach ($this->scheduled_tasks as $task_name => $task) {
			$task_record = ORM::for_table('ttrss_scheduled_tasks')
				->where('task_name', $task_name)
				->find_one();

			if ($task_record)
				$last_run = $task_record->last_run;
			else
				$last_run = '1970-01-01 00:00';

			// because we don't schedule tasks every minute, we assume that task is due if its
			// next estimated run based on previous timestamp is in the past
			if ($task['cron']->getNextRunDate($last_run)->getTimestamp() - time() < 0) {
				Debug::log("=> Scheduled task $task_name is due, executing...");

				$task_started = time();

				try {
					$rc = (int) $task['callback']();
				} catch (Exception $e) {
					user_error("Scheduled task $task_name failed with exception: " . $e->getMessage(), E_USER_WARNING);

					$rc = self::TASK_RC_EXCEPTION;
				}

				$task_duration = time() - $task_started;

				if ($rc === 0) {
					++$tasks_succeeded;
					Debug::log("<= Scheduled task $task_name has finished in $task_duration seconds.");
				} else {
					$tasks_failed++;
					Debug::log("!! Scheduled task $task_name has failed with RC: $rc after $task_duration seconds.");
				}

				if ($task_record) {
					$task_record->last_run = Db::NOW();
					$task_record->last_duration = $task_duration;
					$task_record->last_rc = $rc;

					$task_record->save();
				} else {
					$task_record = ORM::for_table('ttrss_scheduled_tasks')->create();

					$task_record->set([
						'task_name' => $task_name,
						'last_duration' => $task_duration,
						'last_rc' => $rc,
						'last_run' => Db::NOW(),
					]);

					$task_record->save();
				}
			}
		}

		Debug::log("Processing scheduled tasks finished with $tasks_succeeded tasks succeeded and $tasks_failed tasks failed.");
	}

	// TODO implement some sort of automatic cleanup for orphan task execution records
}