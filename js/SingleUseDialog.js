/* global dijit, define */
define(["dojo/_base/declare", "dijit/Dialog"], function (declare) {
	return declare("fox.SingleUseDialog", dijit.Dialog, {
      onHide: function() {
         this.destroyRecursive();
      }
	});
});
