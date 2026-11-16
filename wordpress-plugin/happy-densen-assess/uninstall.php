<?php
// プラグイン削除時に、保存した設定と定期実行を消す。
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}
delete_option( 'hda_settings' );
delete_option( 'hda_price_cache' );
wp_clear_scheduled_hook( 'hda_refresh_prices' );
wp_clear_scheduled_hook( 'hda_refresh_prices_once' );
