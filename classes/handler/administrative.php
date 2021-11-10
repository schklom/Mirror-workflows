<?php
class Handler_Administrative extends Handler_Protected {
   function before($method) {
      if (parent::before($method)) {
         if (($_SESSION["access_level"] ?? 0) >= UserHelper::ACCESS_LEVEL_ADMIN) {
            return true;
         }
      }
      return false;
   }
}
