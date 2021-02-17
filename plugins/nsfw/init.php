<?php
class NSFW extends Plugin {
	private $host;

	function about() {
		return array(1.0,
			"Hide article content based on tags",
			"fox",
			false);
	}

	function init($host) {
		$this->host = $host;

		$host->add_hook($host::HOOK_RENDER_ARTICLE, $this);
		$host->add_hook($host::HOOK_RENDER_ARTICLE_CDM, $this);
		$host->add_hook($host::HOOK_PREFS_TAB, $this);

	}

	function get_js() {
		return file_get_contents(dirname(__FILE__) . "/init.js");
	}

	function hook_render_article($article) {
		$tags = array_map("trim", explode(",", $this->host->get($this, "tags")));
		$a_tags = array_map("trim", explode(",", $article["tag_cache"]));

		if (count(array_intersect($tags, $a_tags)) > 0) {
			$article["content"] = "<div class='nswf wrapper'>".
					\Controls\button_tag(__("Not work safe (click to toggle)"), '', ['onclick' => 'Plugins.NSFW.toggle(this)']).
					"<div class='nswf content' style='display : none'>".$article["content"]."</div>
				</div>";
		}

		return $article;
	}

	function hook_render_article_cdm($article) {
		return $this->hook_render_article($article);
	}

	function hook_prefs_tab($args) {
		if ($args != "prefPrefs") return;

		$tags = $this->host->get($this, "tags");

		?>
		<div dojoType="dijit.layout.AccordionPane"
			title="<i class='material-icons'>extension</i> <?= __("NSFW Plugin") ?>">
			<form dojoType="dijit.form.Form">

				<?= \Controls\pluginhandler_tags($this, "save") ?>

				<script type="dojo/method" event="onSubmit" args="evt">
					evt.preventDefault();
					if (this.validate()) {
						new Ajax.Request('backend.php', {
							parameters: dojo.objectToQuery(this.getValues()),
							onComplete: function(transport) {
								Notify.info(transport.responseText);
							}
						});
					}
				</script>

				<header><?= __("Tags to consider NSFW (comma-separated):") ?></header>

				<fieldset>
					<textarea dojoType='dijit.form.SimpleTextarea' rows='4'
							style='width: 500px; font-size : 12px;'
							name='tags'><?= $tags ?></textarea>
				</fieldset>

				<hr/>

				<?= \Controls\submit_tag(__("Save")) ?>
			</form>
		</div>
		<?php
	}

	function save() {
		$tags = implode(", ",
			FeedItem_Common::normalize_categories(explode(",", $_POST["tags"] ?? "")));

		$this->host->set($this, "tags", $tags);

		echo __("Configuration saved.");
	}

	function api_version() {
		return 2;
	}

}