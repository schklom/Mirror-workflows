<?php


function stylesheet_tag($filename, $attributes = []) {

	$attributes_str = \Controls\attributes_to_string(
		array_merge(
			[
				"href" => "$filename?" . filemtime($filename),
				"rel" => "stylesheet",
				"type" => "text/css",
				"data-orig-href" => $filename
			],
			$attributes));

	return "<link $attributes_str/>\n";
}

function javascript_tag($filename, $attributes = []) {
	$attributes_str = \Controls\attributes_to_string(
		array_merge(
			[
				"src" => "$filename?" . filemtime($filename),
				"type" => "text/javascript",
				"charset" => "utf-8"
			],
			$attributes));

	return "<script $attributes_str></script>\n";
}

function format_warning($msg, $id = "") {
	return "<div class=\"alert\" id=\"$id\">$msg</div>";
}

function format_notice($msg, $id = "") {
	return "<div class=\"alert alert-info\" id=\"$id\">$msg</div>";
}

function format_error($msg, $id = "") {
	return "<div class=\"alert alert-danger\" id=\"$id\">$msg</div>";
}

function print_notice($msg) {
	return print format_notice($msg);
}

function print_warning($msg) {
	return print format_warning($msg);
}

function print_error($msg) {
	return print format_error($msg);
}
