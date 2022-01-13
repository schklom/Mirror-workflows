/* eslint-disable prefer-rest-params */
/* global define */
// FIXME: there probably is a better, more dojo-like notation for custom data- properties
define(["dojo/_base/declare",
	"dijit/form/Select",
	"dojo/_base/lang", // lang.hitch
	"dijit/MenuItem",
	"dijit/MenuSeparator",
	"dojo/aspect",
	], function (declare, select, lang, MenuItem, MenuSeparator, aspect) {
	return declare("fox.form.Select", select, {
		focus: function() {
			return; // Stop dijit.form.Select from keeping focus after closing the menu
		},
		startup: function() {
         this.inherited(arguments);

			if (this.attr('data-dropdown-skip-first') == 'true') {
				aspect.before(this, "_loadChildren", () => {
					this.options = this.options.splice(1);
				});
			}
		},
		// hook invoked when dropdown MenuItem is clicked
		onItemClick: function(/*item, menu*/) {
			//
		},
		_setValueAttr: function(/*anything*/ newValue, /*Boolean?*/ priorityChange){
			if (this.attr('data-prevent-value-change') == 'true' && newValue != '')
				return;

			this.inherited(arguments);
		},
		// the only difference from dijit/form/Select is _onItemClicked() handler
		_getMenuItemForOption: function(/*_FormSelectWidget.__SelectOption*/ option){
         // summary:
         //    For the given option, return the menu item that should be
         //    used to display it.  This can be overridden as needed
         if (!option.value && !option.label){
            // We are a separator (no label set for it)
            return new MenuSeparator({ownerDocument: this.ownerDocument});
         } else {
            // Just a regular menu option
            const click = lang.hitch(this, "_setValueAttr", option);
            const item = new MenuItem({
               option: option,
               label: (this.labelType === 'text' ? (option.label || '').toString()
                  .replace(/&/g, '&amp;').replace(/</g, '&lt;') :
                  option.label) || this.emptyLabel,
               onClick: () => {
						this.onItemClick(item, this.dropDown);

						click();
					},
               ownerDocument: this.ownerDocument,
               dir: this.dir,
               textDir: this.textDir,
               disabled: option.disabled || false
            });
            item.focusNode.setAttribute("role", "option");

            return item;
         }
      },
	});
});
