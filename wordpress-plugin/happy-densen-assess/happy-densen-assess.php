<?php
/**
 * Plugin Name: ハッピーデンセン AI自動査定
 * Description: 電線の写真から種類を判別し、重量を入れると参考査定金額を表示する査定ウィジェット。ページにショートコード [happy_assess] を置くと表示されます。買取単価は価格表ページから自動取得できます。
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: From North
 * License: GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'HDA_VERSION', '1.0.0' );
define( 'HDA_OPTION', 'hda_settings' );
define( 'HDA_PRICE_CACHE', 'hda_price_cache' );
define( 'HDA_CRON_HOOK', 'hda_refresh_prices' );
define( 'HDA_PRICE_KEYS', array( 'hachi', 'roku', 'f' ) );

/* ------------------------------------------------------------------
 * 設定
 * ------------------------------------------------------------------ */

function hda_default_settings() {
	return array(
		'price_mode'        => 'auto',                     // auto = 価格表ページから自動取得 / manual = 下の手入力値
		'price_hachi'       => 1660,                       // 8割銅線（円/kg 税込）
		'price_roku'        => 1400,                       // 6割銅線
		'price_f'           => 860,                        // Fケーブル（VA線）
		'source_url'        => 'https://colors.main.jp/',  // 価格表ページ
		'happy_chance'      => 33,                         // 最強バージョン（カットイン）が出る確率 %
		'line_url'          => 'https://page.line.me/613fwlhk?openQrModal=true',
		'scroll_offset'     => 80,                         // 固定ヘッダーの高さ px
		'classify_endpoint' => '',                         // AI判定APIのURL。空ならブラウザ内の簡易判定
	);
}

function hda_get_settings() {
	$saved = get_option( HDA_OPTION, array() );
	return wp_parse_args( is_array( $saved ) ? $saved : array(), hda_default_settings() );
}

function hda_valid_price( $value ) {
	$n = (int) $value;
	return ( $n >= 100 && $n <= 20000 ) ? $n : 0;
}

/* ------------------------------------------------------------------
 * 買取単価の自動取得
 * 価格表ページのHTMLから「8割銅線」「6割銅線」「Fケーブル」の金額を読み取る。AIは使わない。
 * ------------------------------------------------------------------ */

function hda_parse_prices( $html ) {
	$out = array();
	// <h4> 名称 <span class="upicon">更新</span></h4> … <font …>1,660</font>円/kg
	$pattern = '/<h4>\s*([^<]+?)\s*(?:<span[^>]*>[^<]*<\/span>)?\s*<\/h4>[\s\S]{0,400}?<font[^>]*>\s*([\d,]+)\s*<\/font>\s*円/u';
	if ( ! preg_match_all( $pattern, $html, $matches, PREG_SET_ORDER ) ) {
		return $out;
	}
	$names = array(
		'hachi' => '/8\s*割\s*銅線/u',
		'roku'  => '/6\s*割\s*銅線/u',
		'f'     => '/F\s*ケーブル|VA\s*線|VVF/iu',
	);
	foreach ( $matches as $m ) {
		$name  = trim( $m[1] );
		$price = hda_valid_price( str_replace( ',', '', $m[2] ) );
		if ( ! $price ) {
			continue;
		}
		foreach ( $names as $key => $regex ) {
			if ( ! isset( $out[ $key ] ) && preg_match( $regex, $name ) ) {
				$out[ $key ] = $price;
			}
		}
	}
	return $out;
}

/**
 * 価格表ページを取得してキャッシュを更新する。
 * 失敗しても前回取得できた単価は残す。
 *
 * @return true|WP_Error
 */
function hda_refresh_prices() {
	$settings = hda_get_settings();
	$cache    = get_option( HDA_PRICE_CACHE, array() );
	$cache    = is_array( $cache ) ? $cache : array();
	$cache['attempted_at'] = time();

	$response = wp_remote_get(
		$settings['source_url'],
		array(
			'timeout'    => 10,
			'user-agent' => 'HappyDensenAssess/' . HDA_VERSION . '; ' . home_url( '/' ),
		)
	);

	$error = null;
	if ( is_wp_error( $response ) ) {
		$error = $response;
	} elseif ( 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
		$error = new WP_Error( 'hda_http', '価格表ページが HTTP ' . (int) wp_remote_retrieve_response_code( $response ) . ' を返しました。' );
	} else {
		$prices = hda_parse_prices( wp_remote_retrieve_body( $response ) );
		if ( empty( $prices ) ) {
			$error = new WP_Error( 'hda_parse', '価格表ページから単価を読み取れませんでした（ページの作りが変わった可能性があります）。' );
		} else {
			$previous           = isset( $cache['prices'] ) && is_array( $cache['prices'] ) ? $cache['prices'] : array();
			$cache['prices']    = array_merge( $previous, $prices );
			$cache['missing']   = array_values( array_diff( HDA_PRICE_KEYS, array_keys( $prices ) ) );
			$cache['fetched_at'] = time();
			$cache['error']     = '';
		}
	}

	if ( $error ) {
		$cache['error'] = $error->get_error_message();
	}
	update_option( HDA_PRICE_CACHE, $cache, false );
	return $error ? $error : true;
}
add_action( HDA_CRON_HOOK, 'hda_refresh_prices' );

/**
 * 画面に出す単価を返す。
 * 自動取得モードで取得済みならその値、なければ手入力値。
 */
function hda_current_prices() {
	$settings = hda_get_settings();
	$prices   = array(
		'hachi' => hda_valid_price( $settings['price_hachi'] ) ?: 1660,
		'roku'  => hda_valid_price( $settings['price_roku'] ) ?: 1400,
		'f'     => hda_valid_price( $settings['price_f'] ) ?: 860,
	);
	$updated = '';
	$source  = 'manual';

	if ( 'auto' === $settings['price_mode'] ) {
		$cache = get_option( HDA_PRICE_CACHE, array() );
		if ( is_array( $cache ) && ! empty( $cache['prices'] ) ) {
			foreach ( HDA_PRICE_KEYS as $key ) {
				if ( isset( $cache['prices'][ $key ] ) && hda_valid_price( $cache['prices'][ $key ] ) ) {
					$prices[ $key ] = (int) $cache['prices'][ $key ];
				}
			}
			$updated = empty( $cache['fetched_at'] ) ? '' : wp_date( 'Y/m/d', (int) $cache['fetched_at'] );
			$source  = 'auto';
		}
	}
	return array(
		'prices'  => $prices,
		'updated' => $updated,
		'source'  => $source,
	);
}

/* ------------------------------------------------------------------
 * 定期実行（6時間ごと）
 * ------------------------------------------------------------------ */

function hda_cron_schedules( $schedules ) {
	$schedules['hda_six_hours'] = array(
		'interval' => 6 * HOUR_IN_SECONDS,
		'display'  => '6時間ごと（ハッピーデンセン査定）',
	);
	return $schedules;
}
add_filter( 'cron_schedules', 'hda_cron_schedules' );

function hda_activate() {
	if ( ! wp_next_scheduled( HDA_CRON_HOOK ) ) {
		wp_schedule_event( time() + 6 * HOUR_IN_SECONDS, 'hda_six_hours', HDA_CRON_HOOK );
	}
	hda_refresh_prices();
}
register_activation_hook( __FILE__, 'hda_activate' );

function hda_deactivate() {
	wp_clear_scheduled_hook( HDA_CRON_HOOK );
}
register_deactivation_hook( __FILE__, 'hda_deactivate' );

/** 定期実行が止まっていた場合の保険: 表示時に12時間以上古ければ裏で取り直しを予約する。 */
function hda_maybe_schedule_refresh() {
	$settings = hda_get_settings();
	if ( 'auto' !== $settings['price_mode'] ) {
		return;
	}
	$cache     = get_option( HDA_PRICE_CACHE, array() );
	$fetched   = is_array( $cache ) && ! empty( $cache['fetched_at'] ) ? (int) $cache['fetched_at'] : 0;
	$attempted = is_array( $cache ) && ! empty( $cache['attempted_at'] ) ? (int) $cache['attempted_at'] : 0;
	if ( time() - $fetched > 12 * HOUR_IN_SECONDS && time() - $attempted > HOUR_IN_SECONDS && ! wp_next_scheduled( HDA_CRON_HOOK . '_once' ) ) {
		wp_schedule_single_event( time(), HDA_CRON_HOOK . '_once' );
	}
}
add_action( HDA_CRON_HOOK . '_once', 'hda_refresh_prices' );

/* ------------------------------------------------------------------
 * REST: 単価（ページキャッシュが効いていても最新の単価を返せるようにする）
 * GET /wp-json/happy-assess/v1/prices
 * ------------------------------------------------------------------ */

function hda_register_rest() {
	register_rest_route(
		'happy-assess/v1',
		'/prices',
		array(
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => function () {
				$current  = hda_current_prices();
				$response = rest_ensure_response(
					array(
						'prices'  => $current['prices'],
						'updated' => $current['updated'],
					)
				);
				$response->header( 'Cache-Control', 'public, max-age=300' );
				return $response;
			},
		)
	);
}
add_action( 'rest_api_init', 'hda_register_rest' );

/* ------------------------------------------------------------------
 * 表示（ショートコード [happy_assess]）
 * ------------------------------------------------------------------ */

function hda_asset_version( $file ) {
	$path = plugin_dir_path( __FILE__ ) . 'assets/' . $file;
	return file_exists( $path ) ? HDA_VERSION . '.' . filemtime( $path ) : HDA_VERSION;
}

function hda_register_assets() {
	$base = plugin_dir_url( __FILE__ ) . 'assets/';
	wp_register_style( 'happy-densen-assess', $base . 'style.css', array(), hda_asset_version( 'style.css' ) );
	wp_register_script( 'happy-densen-assess', $base . 'embed.js', array(), hda_asset_version( 'embed.js' ), true );
}
add_action( 'wp_enqueue_scripts', 'hda_register_assets', 5 );

function hda_enqueue_assets() {
	static $done = false;
	if ( $done ) {
		return;
	}
	$done = true;

	if ( ! wp_script_is( 'happy-densen-assess', 'registered' ) ) {
		hda_register_assets();
	}
	$settings = hda_get_settings();
	$current  = hda_current_prices();
	$config   = array(
		'prices'           => $current['prices'],
		'pricesUpdated'    => $current['updated'],
		'happyChance'      => max( 0, min( 100, (int) $settings['happy_chance'] ) ) / 100,
		'classifyEndpoint' => (string) $settings['classify_endpoint'],
		'pricesEndpoint'   => esc_url_raw( rest_url( 'happy-assess/v1/prices' ) ),
		'scrollOffset'     => (int) $settings['scroll_offset'],
		'lineUrl'          => (string) $settings['line_url'],
		'assetBase'        => plugin_dir_url( __FILE__ ) . 'assets/',
	);
	wp_enqueue_style( 'happy-densen-assess' );
	wp_enqueue_script( 'happy-densen-assess' );
	wp_add_inline_script( 'happy-densen-assess', 'window.HAPPY_CONFIG = ' . wp_json_encode( $config ) . ';', 'before' );
	hda_maybe_schedule_refresh();
}

/** ショートコードを含む投稿・固定ページでは <head> でCSSを読み込む（ちらつき防止）。 */
function hda_enqueue_when_needed() {
	if ( is_singular() ) {
		$post = get_post();
		if ( $post && has_shortcode( (string) $post->post_content, 'happy_assess' ) ) {
			hda_enqueue_assets();
		}
	}
}
add_action( 'wp_enqueue_scripts', 'hda_enqueue_when_needed', 20 );

/** embed.js が自分でCSSを二重に読み込まないよう、目印の属性を付ける。 */
function hda_style_tag( $tag, $handle ) {
	if ( 'happy-densen-assess' === $handle && false === strpos( $tag, 'data-hda-css' ) ) {
		$tag = str_replace( '<link ', '<link data-hda-css="1" ', $tag );
	}
	return $tag;
}
add_filter( 'style_loader_tag', 'hda_style_tag', 10, 2 );

function hda_shortcode() {
	hda_enqueue_assets();
	// alignwide: ブロックテーマの本文幅より広く取る。最大幅はデザインの基準幅 840px。
	return '<div class="happy-assess-wrap alignwide" style="max-width:840px;margin-left:auto;margin-right:auto;">'
		. '<div data-happy-assess></div>'
		. '<noscript>査定ウィジェットの表示には JavaScript が必要です。</noscript>'
		. '</div>';
}
add_shortcode( 'happy_assess', 'hda_shortcode' );

/* ------------------------------------------------------------------
 * 管理画面（設定 → ハッピーデンセン査定）
 * ------------------------------------------------------------------ */

function hda_admin_menu() {
	add_options_page( 'ハッピーデンセン査定', 'ハッピーデンセン査定', 'manage_options', 'happy-densen-assess', 'hda_render_settings_page' );
}
add_action( 'admin_menu', 'hda_admin_menu' );

function hda_action_links( $links ) {
	array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=happy-densen-assess' ) ) . '">設定</a>' );
	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'hda_action_links' );

function hda_sanitize_settings( $input ) {
	$defaults = hda_default_settings();
	$out      = array();
	$out['price_mode'] = ( isset( $input['price_mode'] ) && 'manual' === $input['price_mode'] ) ? 'manual' : 'auto';
	foreach ( array( 'price_hachi', 'price_roku', 'price_f' ) as $key ) {
		$value       = isset( $input[ $key ] ) ? hda_valid_price( $input[ $key ] ) : 0;
		$out[ $key ] = $value ? $value : $defaults[ $key ];
	}
	$source            = isset( $input['source_url'] ) ? esc_url_raw( trim( (string) $input['source_url'] ), array( 'http', 'https' ) ) : '';
	$out['source_url'] = $source ? $source : $defaults['source_url'];
	$out['happy_chance']      = isset( $input['happy_chance'] ) ? max( 0, min( 100, (int) $input['happy_chance'] ) ) : $defaults['happy_chance'];
	$out['line_url']          = isset( $input['line_url'] ) ? esc_url_raw( trim( (string) $input['line_url'] ), array( 'http', 'https' ) ) : '';
	$out['scroll_offset']     = isset( $input['scroll_offset'] ) ? max( 0, min( 400, (int) $input['scroll_offset'] ) ) : $defaults['scroll_offset'];
	$out['classify_endpoint'] = isset( $input['classify_endpoint'] ) ? esc_url_raw( trim( (string) $input['classify_endpoint'] ), array( 'https' ) ) : '';
	return $out;
}

function hda_handle_admin_post() {
	if ( ! isset( $_POST['hda_action'] ) || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	check_admin_referer( 'hda_settings' );
	$action = sanitize_key( wp_unslash( $_POST['hda_action'] ) );
	$notice = 'saved';

	if ( 'save' === $action ) {
		$input = isset( $_POST['hda'] ) && is_array( $_POST['hda'] ) ? wp_unslash( $_POST['hda'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$old   = hda_get_settings();
		$new   = hda_sanitize_settings( $input );
		update_option( HDA_OPTION, $new, false );
		if ( 'auto' === $new['price_mode'] && ( 'auto' !== $old['price_mode'] || $old['source_url'] !== $new['source_url'] ) ) {
			$result = hda_refresh_prices();
			$notice = is_wp_error( $result ) ? 'saved_fetch_failed' : 'saved';
		}
	} elseif ( 'refresh' === $action ) {
		$result = hda_refresh_prices();
		$notice = is_wp_error( $result ) ? 'fetch_failed' : 'fetched';
	}
	wp_safe_redirect( add_query_arg( array( 'page' => 'happy-densen-assess', 'hda_notice' => $notice ), admin_url( 'options-general.php' ) ) );
	exit;
}
add_action( 'admin_init', 'hda_handle_admin_post' );

function hda_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$s       = hda_get_settings();
	$current = hda_current_prices();
	$cache   = get_option( HDA_PRICE_CACHE, array() );
	$cache   = is_array( $cache ) ? $cache : array();
	$labels  = array( 'hachi' => '8割銅線', 'roku' => '6割銅線', 'f' => 'Fケーブル（VA線）' );
	$notice  = isset( $_GET['hda_notice'] ) ? sanitize_key( wp_unslash( $_GET['hda_notice'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$notices = array(
		'saved'              => array( 'success', '設定を保存しました。' ),
		'fetched'            => array( 'success', '価格表ページから単価を取得しました。' ),
		'fetch_failed'       => array( 'error', '単価を取得できませんでした。下の「取得の状態」を確認してください。' ),
		'saved_fetch_failed' => array( 'warning', '設定は保存しましたが、単価を取得できませんでした。下の「取得の状態」を確認してください。' ),
	);
	$next = wp_next_scheduled( HDA_CRON_HOOK );
	?>
	<div class="wrap">
		<h1>ハッピーデンセン査定</h1>
		<?php if ( isset( $notices[ $notice ] ) ) : ?>
			<div class="notice notice-<?php echo esc_attr( $notices[ $notice ][0] ); ?> is-dismissible"><p><?php echo esc_html( $notices[ $notice ][1] ); ?></p></div>
		<?php endif; ?>

		<p>査定ウィジェットを表示したいページに、ショートコード <code>[happy_assess]</code> を置いてください。</p>

		<h2>いま画面に出ている単価</h2>
		<table class="widefat striped" style="max-width:560px">
			<thead><tr><th>種類</th><th>単価（円/kg・税込）</th></tr></thead>
			<tbody>
			<?php foreach ( $labels as $key => $label ) : ?>
				<tr><td><?php echo esc_html( $label ); ?></td><td><strong><?php echo esc_html( number_format_i18n( $current['prices'][ $key ] ) ); ?></strong></td></tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<p>
			<?php if ( 'auto' === $current['source'] ) : ?>
				価格表ページから自動取得した値です（最終取得: <?php echo esc_html( wp_date( 'Y/m/d H:i', (int) $cache['fetched_at'] ) ); ?>）。
			<?php elseif ( 'auto' === $s['price_mode'] ) : ?>
				自動取得がまだ成功していないため、手入力の値を表示しています。
			<?php else : ?>
				手入力の値を表示しています。
			<?php endif; ?>
		</p>

		<h2>取得の状態</h2>
		<ul style="list-style:disc;margin-left:1.5em">
			<li>最後に取得できた日時: <?php echo empty( $cache['fetched_at'] ) ? 'まだありません' : esc_html( wp_date( 'Y/m/d H:i', (int) $cache['fetched_at'] ) ); ?></li>
			<li>最後に取得を試した日時: <?php echo empty( $cache['attempted_at'] ) ? 'まだありません' : esc_html( wp_date( 'Y/m/d H:i', (int) $cache['attempted_at'] ) ); ?></li>
			<li>次回の自動取得予定: <?php echo $next ? esc_html( wp_date( 'Y/m/d H:i', (int) $next ) ) : '予定なし（プラグインを一度無効化して有効化し直してください）'; ?></li>
			<?php if ( ! empty( $cache['error'] ) ) : ?>
				<li style="color:#b32d2e"><strong>直近のエラー:</strong> <?php echo esc_html( $cache['error'] ); ?></li>
			<?php endif; ?>
			<?php if ( ! empty( $cache['missing'] ) && is_array( $cache['missing'] ) ) : ?>
				<li style="color:#b32d2e"><strong>価格表ページで見つからなかった種類:</strong>
					<?php echo esc_html( implode( '、', array_map( function ( $k ) use ( $labels ) { return isset( $labels[ $k ] ) ? $labels[ $k ] : $k; }, $cache['missing'] ) ) ); ?>（前回の値、なければ手入力の値を使っています）
				</li>
			<?php endif; ?>
		</ul>
		<form method="post">
			<?php wp_nonce_field( 'hda_settings' ); ?>
			<input type="hidden" name="hda_action" value="refresh">
			<?php submit_button( '単価を今すぐ取得する', 'secondary', 'submit', false ); ?>
		</form>

		<hr>
		<form method="post">
			<?php wp_nonce_field( 'hda_settings' ); ?>
			<input type="hidden" name="hda_action" value="save">
			<h2>設定</h2>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">単価の決め方</th>
					<td>
						<fieldset>
							<label><input type="radio" name="hda[price_mode]" value="auto" <?php checked( $s['price_mode'], 'auto' ); ?>> 価格表ページから自動取得する（6時間ごと）</label><br>
							<label><input type="radio" name="hda[price_mode]" value="manual" <?php checked( $s['price_mode'], 'manual' ); ?>> 下の手入力の値を使う</label>
						</fieldset>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="hda-source">価格表ページのURL</label></th>
					<td><input type="url" class="regular-text" id="hda-source" name="hda[source_url]" value="<?php echo esc_attr( $s['source_url'] ); ?>">
					<p class="description">このページから「8割銅線」「6割銅線」「Fケーブル」の金額を読み取ります。</p></td>
				</tr>
				<?php foreach ( array( 'price_hachi' => '8割銅線', 'price_roku' => '6割銅線', 'price_f' => 'Fケーブル（VA線）' ) as $key => $label ) : ?>
				<tr>
					<th scope="row"><label for="hda-<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $label ); ?>（手入力）</label></th>
					<td><input type="number" min="100" max="20000" step="1" class="small-text" style="width:7em" id="hda-<?php echo esc_attr( $key ); ?>" name="hda[<?php echo esc_attr( $key ); ?>]" value="<?php echo esc_attr( $s[ $key ] ); ?>"> 円/kg（税込）
					<?php if ( 'price_hachi' === $key ) : ?><p class="description">手入力の値は、自動取得に失敗したときの予備としても使われます。</p><?php endif; ?></td>
				</tr>
				<?php endforeach; ?>
				<tr>
					<th scope="row"><label for="hda-chance">最強バージョンが出る確率</label></th>
					<td><input type="number" min="0" max="100" step="1" class="small-text" id="hda-chance" name="hda[happy_chance]" value="<?php echo esc_attr( $s['happy_chance'] ); ?>"> %
					<p class="description">査定結果のあとにカットイン演出が入る確率です。金額には影響しません。</p></td>
				</tr>
				<tr>
					<th scope="row"><label for="hda-line">LINEボタンのリンク先</label></th>
					<td><input type="url" class="regular-text" id="hda-line" name="hda[line_url]" value="<?php echo esc_attr( $s['line_url'] ); ?>">
					<p class="description">査定結果の画面に出るLINEボタンのリンク先です。空にするとボタンを表示しません。</p></td>
				</tr>
				<tr>
					<th scope="row"><label for="hda-offset">固定ヘッダーの高さ</label></th>
					<td><input type="number" min="0" max="400" step="1" class="small-text" id="hda-offset" name="hda[scroll_offset]" value="<?php echo esc_attr( $s['scroll_offset'] ); ?>"> px
					<p class="description">画面が切り替わるとき、ウィジェットの上端をこの分だけ下げた位置に合わせます。</p></td>
				</tr>
				<tr>
					<th scope="row"><label for="hda-classify">AI判定APIのURL</label></th>
					<td><input type="url" class="regular-text" id="hda-classify" name="hda[classify_endpoint]" value="<?php echo esc_attr( $s['classify_endpoint'] ); ?>" placeholder="https://">
					<p class="description">空のままなら、ブラウザ内の簡易判定で動きます（費用はかかりません）。</p></td>
				</tr>
			</table>
			<?php submit_button( '設定を保存する' ); ?>
		</form>
	</div>
	<?php
}
