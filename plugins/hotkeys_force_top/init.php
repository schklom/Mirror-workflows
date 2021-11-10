<?php
class Hotkeys_Force_Top extends Plugin {
        function about() {
                return array(null,
                        "Force open article to the top",
                        "itsamenathan");
        }

        function init($host) {

        }

        function get_js() {
                return file_get_contents(__DIR__ . "/init.js");
        }

        function api_version() {
                return 2;
        }

}
