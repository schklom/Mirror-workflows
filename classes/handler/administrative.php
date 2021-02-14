<?php
class Handler_Administrative extends Handler_Protected {
   function before($method) {
      if (parent::before($method)) {
         if (($_SESSION["access_level"] ?? 0) >= 10) {
            return true;
         }
      }
      return false;
   }
}
