<?php
   namespace Controls;

   function attributes_to_string(array $attributes) {
      $rv = "";

      foreach ($attributes as $k => $v) {
         $rv .= "$k=\"" . htmlspecialchars($v) . "\"";
      }

      return $rv;
   }

   function button_tag(string $value, string $type, array $attributes = []) {
      return "<button dojoType=\"dijit.form.Button\" ".attributes_to_string($attributes)." type=\"$type\">".htmlspecialchars($value)."</button>";
   }

   function submit_tag(string $value, array $attributes = []) {
      return button_tag($value, "submit", array_merge(["class" => "alt-primary"], $attributes));
   }

   function select_tag(string $name, $value, array $values, array $attributes = [], string $id = "") {
      $attributes_str = attributes_to_string($attributes);
      $dojo_type = strpos($attributes_str, "dojoType") === false ? "dojoType='fox.form.Select'" : "";

      $rv = "<select $dojo_type name=\"".htmlspecialchars($name)."\"
         id=\"".htmlspecialchars($id)."\" name=\"".htmlspecialchars($name)."\" $attributes_str>";

      foreach ($values as $v) {
         $is_sel = ($v == $value) ? "selected=\"selected\"" : "";

         $rv .= "<option value=\"".htmlspecialchars($v)."\" $is_sel>".htmlspecialchars($v)."</option>";
      }

      $rv .= "</select>";

      return $rv;
   }

   function select_labels(string $name, string $value, array $attributes = [], string $id = "") {
      $pdo = \Db::pdo();

      $sth = $pdo->prepare("SELECT caption FROM ttrss_labels2
            WHERE owner_uid = ? ORDER BY caption");
      $sth->execute([$_SESSION['uid']]);

      $values = [];

      while ($row = $sth->fetch()) {
         array_push($values, $row["caption"]);
      }

      return select_tag($name, $value, $values, $attributes, $id);
   }

   function select_hash(string $name, $value, array $values, array $attributes = [], string $id = "") {
      $attributes_str = attributes_to_string($attributes);
      $dojo_type = strpos($attributes_str, "dojoType") === false ? "dojoType='fox.form.Select'" : "";

      $rv = "<select $dojo_type name=\"".htmlspecialchars($name)."\"
         id=\"".htmlspecialchars($id)."\" name=\"".htmlspecialchars($name)."\" $attributes_str>";

      foreach ($values as $k => $v) {
         $is_sel = ($k == $value) ? "selected=\"selected\"" : "";

         $rv .= "<option value=\"".htmlspecialchars($k)."\" $is_sel>".htmlspecialchars($v)."</option>";
      }

      $rv .= "</select>";

      return $rv;
   }

   function hidden_tag(string $name, string $value, array $attributes = []) {
      return "<input dojoType=\"dijit.form.TextBox\" style=\"display : none\"
               ".attributes_to_string($attributes)." name=\"".htmlspecialchars($name)."\"
               value=\"".htmlspecialchars($value)."\">";
   }

   function checkbox_tag(string $name, bool $checked = false, string $value = "", array $attributes = [], string $id = "") {
      $is_checked = $checked ? "checked" : "";
      $value_str = $value ? "value=\"".htmlspecialchars($value)."\"" : "";

      return "<input dojoType='dijit.form.CheckBox' name=\"".htmlspecialchars($name)."\"
                  $value_str $is_checked ".attributes_to_string($attributes)." id=\"".htmlspecialchars($id)."\">";
   }

   function select_feeds_cats(string $name, int $default_id = null, array $attributes = [],
                  bool $include_all_cats = true, string $root_id = null, int $nest_level = 0, string $id = "") {

      $ret = "";

      if (!$root_id) {
         $ret .= "<select name=\"".htmlspecialchars($name)."\"
                        id=\"".htmlspecialchars($id)."\"
                        default=\"".((string)$default_id)."\"
                        dojoType=\"fox.form.Select\" ".attributes_to_string($attributes).">";
      }

      $pdo = \Db::pdo();

      if (!$root_id) $root_id = null;

      $sth = $pdo->prepare("SELECT id,title,
               (SELECT COUNT(id) FROM ttrss_feed_categories AS c2 WHERE
                  c2.parent_cat = ttrss_feed_categories.id) AS num_children
               FROM ttrss_feed_categories
               WHERE owner_uid = :uid AND
               (parent_cat = :root_id OR (:root_id IS NULL AND parent_cat IS NULL)) ORDER BY title");
      $sth->execute([":uid" => $_SESSION['uid'], ":root_id" => $root_id]);

      $found = 0;

      while ($line = $sth->fetch()) {
         ++$found;

         if ($line["id"] == $default_id) {
            $is_selected = "selected=\"1\"";
         } else {
            $is_selected = "";
         }

         for ($i = 0; $i < $nest_level; $i++)
            $line["title"] = " " . $line["title"];

         if ($line["title"])
            $ret .= sprintf("<option $is_selected value='%d'>%s</option>",
               $line["id"], htmlspecialchars($line["title"]));

         if ($line["num_children"] > 0)
            $ret .= select_feeds_cats($id, $default_id, $attributes,
               $include_all_cats, $line["id"], $nest_level+1, $id);
      }

      if (!$root_id) {
         if ($include_all_cats) {
            if ($found > 0) {
               $ret .= "<option disabled=\"1\">―――――――――――――――</option>";
            }

            if ($default_id == 0) {
               $is_selected = "selected=\"1\"";
            } else {
               $is_selected = "";
            }

            $ret .= "<option $is_selected value=\"0\">".__('Uncategorized')."</option>";
         }
         $ret .= "</select>";
      }

      return $ret;
   }

