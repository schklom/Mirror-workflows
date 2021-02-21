/* global define */

// only supports required for the time being
// TODO: maybe show dojo native error message? i dunno
define(["dojo/_base/declare", "dojo/_base/lang", "dijit/form/MultiSelect", ],
    function(declare, lang, MultiSelect) {

        return declare('fox.form.ValidationMultiSelect', [MultiSelect], {
            constructor: function(params){
                this.constraints = {};
                this.baseClass += ' dijitValidationMultiSelect';
            },
            validate: function(/*Boolean*/ isFocused){
                if (this.required && this.attr('value').length == 0)
                    return false;

                return true;
            },
        })
    });
