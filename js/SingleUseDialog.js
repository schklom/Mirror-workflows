/* eslint-disable prefer-rest-params */
/* global dijit, define */
define(["dojo/_base/declare", "dijit/Dialog"], function (declare) {
	return declare("fox.SingleUseDialog", dijit.Dialog, {
      create: function(params) {
            const extant = dijit.byId(params.id);

            if (extant) {
                  console.warn('SingleUseDialog: destroying existing widget:', params.id, '=', extant)
                  extant.destroyRecursive();
            }

            return this.inherited(arguments);
      },
      onHide: function() {
         this.destroyRecursive();
      }
	});
});
