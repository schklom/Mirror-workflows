export interface StoriesIGProfile {
	result: Result;
}

export interface StoriesIGStories {
	result: ResultStories[];
}

export interface ResultStories {
	image_versions2: ImageVersions2;
	original_height: number;
	original_width: number;
	pk: string;
	taken_at: number;
	video_versions?: VideoVersion[];
	has_audio?: boolean;
}

export interface ImageVersions2 {
	candidates: VideoVersion[];
}

export interface VideoVersion {
	width: number;
	height: number;
	url: string;
	url_signature: URLSignature;
	type?: number;
}

interface Result {
	user: ResultUser;
	status: string;
}

interface ResultUser {
	biography: string;
	primary_profile_link_type: number;
	show_fb_link_on_profile: boolean;
	show_fb_page_link_on_profile: boolean;
	can_hide_category: boolean;
	smb_support_partner: null;
	current_catalog_id: null;
	mini_shop_seller_onboarding_status: null;
	account_category: string;
	can_add_fb_group_link_on_profile: boolean;
	can_use_affiliate_partnership_messaging_as_creator: boolean;
	can_use_affiliate_partnership_messaging_as_brand: boolean;
	existing_user_age_collection_enabled: boolean;
	fbid_v2: string;
	feed_post_reshare_disabled: boolean;
	full_name: string;
	has_public_tab_threads: boolean;
	highlight_reshare_disabled: boolean;
	include_direct_blacklist_status: boolean;
	is_direct_roll_call_enabled: boolean;
	is_new_to_instagram: boolean;
	is_private: boolean;
	pk: string;
	pk_id: string;
	profile_type: number;
	show_account_transparency_details: boolean;
	show_post_insights_entry_point: boolean;
	third_party_downloads_enabled: number;
	username: string;
	biography_with_entities: BiographyWithEntities;
	external_lynx_url: string;
	external_url: string;
	has_biography_translation: boolean;
	can_hide_public_contacts: boolean;
	category: string;
	should_show_category: boolean;
	category_id: string;
	is_category_tappable: boolean;
	should_show_public_contacts: boolean;
	is_eligible_for_smb_support_flow: boolean;
	is_eligible_for_lead_center: boolean;
	is_experienced_advertiser: boolean;
	lead_details_app_id: string;
	is_business: boolean;
	professional_conversion_suggested_account_type: number;
	account_type: number;
	direct_messaging: string;
	instagram_location_id: string;
	address_street: string;
	business_contact_method: string;
	city_id: string;
	city_name: string;
	contact_phone_number: string;
	is_profile_audio_call_enabled: boolean;
	latitude: number;
	longitude: number;
	public_email: string;
	public_phone_country_code: string;
	public_phone_number: string;
	zip: string;
	displayed_action_button_partner: null;
	smb_delivery_partner: null;
	smb_support_delivery_partner: null;
	displayed_action_button_type: string;
	is_call_to_action_enabled: boolean;
	num_of_admined_pages: null;
	page_id: null;
	page_name: null;
	ads_page_id: null;
	ads_page_name: null;
	shopping_post_onboard_nux_type: null;
	ads_incentive_expiration_date: null;
	// rome-ignore lint/suspicious/noExplicitAny: <explanation>
	account_badges: any[];
	auto_expand_chaining: null;
	bio_links: BioLink[];
	birthday_today_visibility_for_viewer: string;
	broadcast_chat_preference_status: BroadcastChatPreferenceStatus;
	can_use_branded_content_discovery_as_brand: boolean;
	can_use_branded_content_discovery_as_creator: boolean;
	creator_shopping_info: CreatorShoppingInfo;
	fan_club_info: FanClubInfo;
	follow_friction_type: number;
	follower_count: number;
	following_count: number;
	following_tag_count: number;
	has_anonymous_profile_picture: boolean;
	has_collab_collections: boolean;
	has_exclusive_feed_content: boolean;
	has_fan_club_subscriptions: boolean;
	has_guides: boolean;
	has_highlight_reels: boolean;
	has_igtv_series: boolean;
	has_music_on_profile: boolean;
	has_private_collections: boolean;
	has_videos: boolean;
	hd_profile_pic_url_info: HDProfilePic;
	hd_profile_pic_versions: HDProfilePic[];
	interop_messaging_user_fbid: number;
	is_bestie: boolean;
	is_favorite: boolean;
	is_in_canada: boolean;
	is_interest_account: boolean;
	is_memorialized: boolean;
	is_potential_business: boolean;
	is_profile_broadcast_sharing_enabled: boolean;
	is_regulated_c18: boolean;
	is_supervision_features_enabled: boolean;
	is_verified: boolean;
	is_whatsapp_linked: boolean;
	media_count: number;
	merchant_checkout_style: string;
	mutual_followers_count: number;
	nametag: null;
	open_external_url_with_in_app_browser: boolean;
	pinned_channels_info: PinnedChannelsInfo;
	profile_context: string;
	profile_context_facepile_users: ProfileContextFacepileUser[];
	profile_context_links_with_user_ids: ProfileContextLinksWithUserID[];
	profile_context_mutual_follow_ids: number[];
	profile_pic_id: string;
	profile_pic_url: string;
	// rome-ignore lint/suspicious/noExplicitAny: <explanation>
	pronouns: any[];
	remove_message_entrypoint: boolean;
	robi_feedback_source: null;
	seller_shoppable_feed_type: string;
	show_shoppable_feed: boolean;
	show_together_pog: boolean;
	total_ar_effects: number;
	total_clips_count: number;
	total_igtv_videos: number;
	transparency_product_enabled: boolean;
	usertags_count: number;
	is_profile_picture_expansion_enabled: boolean;
	is_secret_profile_enabled: boolean;
	profile_pic_url_signature: URLSignature;
}

interface BioLink {
	link_id: string;
	url: string;
	lynx_url: string;
	link_type: string;
	title: string;
	open_external_url_with_in_app_browser: boolean;
}

interface BiographyWithEntities {
	raw_text: string;
	entities: Entity[];
}

interface Entity {
	user: EntityUser;
}

interface EntityUser {
	id: string;
	username: string;
}

interface BroadcastChatPreferenceStatus {
	json_response: string;
}

interface CreatorShoppingInfo {
	// rome-ignore lint/suspicious/noExplicitAny: <explanation>
	linked_merchant_accounts: any[];
}

interface FanClubInfo {
	fan_club_id: null;
	fan_club_name: null;
	is_fan_club_referral_eligible: null;
	fan_consideration_page_revamp_eligiblity: null;
	is_fan_club_gifting_eligible: null;
	subscriber_count: null;
	connected_member_count: null;
	autosave_to_exclusive_highlight: null;
	has_enough_subscribers_for_ssc: null;
}

interface HDProfilePic {
	url: string;
	width: number;
	height: number;
	url_signature: URLSignature;
}

interface URLSignature {
	expires: number;
	signature: string;
}

interface PinnedChannelsInfo {
	// rome-ignore lint/suspicious/noExplicitAny: <explanation>
	pinned_channels_list: any[];
	has_public_channels: boolean;
}

interface ProfileContextFacepileUser {
	pk: string;
	pk_id: string;
	username: string;
	full_name: string;
	is_private: boolean;
	is_verified: boolean;
	profile_pic_id: string;
	profile_pic_url: string;
}

interface ProfileContextLinksWithUserID {
	start: number;
	end: number;
	username?: string;
}
