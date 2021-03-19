/* global define, dijit */

define(["dojo/_base/declare", "dijit/tree/ForestStoreModel"], function (declare) {

	return declare("fox.FeedStoreModel", dijit.tree.ForestStoreModel, {
		getItemsInCategory: function (id) {
			if (!this.store._itemsByIdentity) return undefined;

			const cat = this.store._itemsByIdentity['CAT:' + id];

			if (cat && cat.items)
				return cat.items;
			else
				return undefined;

		},
		getItemById: function (id) {
			return this.store._itemsByIdentity[id];
		},
		getFeedValue: function (feed, is_cat, key) {
			if (!this.store._itemsByIdentity) return undefined;

			let treeItem;

			if (is_cat)
				treeItem = this.store._itemsByIdentity['CAT:' + feed];
			else
				treeItem = this.store._itemsByIdentity['FEED:' + feed];

			if (treeItem)
				return this.store.getValue(treeItem, key);
		},
		getFeedName: function (feed, is_cat) {
			return this.getFeedValue(feed, is_cat, 'name');
		},
		getFeedUnread: function (feed, is_cat) {
			const unread = parseInt(this.getFeedValue(feed, is_cat, 'unread'));
			return (isNaN(unread)) ? -1 : unread;
		},
		setFeedUnread: function (feed, is_cat, unread) {
			return this.setFeedValue(feed, is_cat, 'unread', parseInt(unread));
		},
		setFeedValue: function (feed, is_cat, key, value) {
			if (!value) value = '';
			if (!this.store._itemsByIdentity) return undefined;

			let treeItem;

			if (is_cat)
				treeItem = this.store._itemsByIdentity['CAT:' + feed];
			else
				treeItem = this.store._itemsByIdentity['FEED:' + feed];

			if (treeItem)
				return this.store.setValue(treeItem, key, value);
		},
		hasCats: function () {
			if (this.store && this.store._itemsByIdentity)
				return this.store._itemsByIdentity['CAT:-1'] != undefined;
			else
				return false;
		},

	});
});


