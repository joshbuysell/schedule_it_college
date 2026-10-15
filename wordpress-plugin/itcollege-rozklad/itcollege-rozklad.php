<?php
/**
 * Plugin Name:       Розклад ІТ коледжу
 * Description:       Вбудовує живий розклад занять (групи, викладачі, аудиторії) на сторінки сайту. Шорткод: [itcollege_rozklad] або [itcollege_rozklad group="КІ-21"].
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Фаховий коледж інформаційних технологій НУ «Львівська політехніка»
 * License:           GPL-2.0-or-later
 * Text Domain:       itcollege-rozklad
 */

if (!defined('ABSPATH')) {
    exit;
}

const ITC_ROZKLAD_OPTION = 'itc_rozklad_url';

/** Адреса системи розкладу без кінцевого слеша. */
function itc_rozklad_base_url() {
    return untrailingslashit(esc_url_raw(get_option(ITC_ROZKLAD_OPTION, '')));
}

/**
 * [itcollege_rozklad]                 — вибір групи / викладача
 * [itcollege_rozklad group="КІ-21"]   — розклад однієї групи
 */
function itc_rozklad_shortcode($atts) {
    $atts = shortcode_atts(['group' => ''], $atts, 'itcollege_rozklad');
    $base = itc_rozklad_base_url();

    if (!$base) {
        return current_user_can('manage_options')
            ? '<p><strong>Розклад:</strong> вкажіть адресу системи в Налаштування → Розклад ІТ коледжу.</p>'
            : '';
    }

    wp_enqueue_script('itc-rozklad-embed', $base . '/embed.js', [], '1.0.0', ['strategy' => 'async', 'in_footer' => true]);

    $group = sanitize_text_field($atts['group']);
    $fallback = esc_url($base . '/embed' . ($group ? '?select=' . rawurlencode('g:' . $group) : ''));

    return sprintf(
        '<div class="itc-rozklad" data-itc-rozklad%s><noscript><iframe src="%s" title="Розклад занять" width="100%%" height="1100" style="border:0"></iframe></noscript></div>',
        $group ? ' data-group="' . esc_attr($group) . '"' : '',
        $fallback
    );
}
add_shortcode('itcollege_rozklad', 'itc_rozklad_shortcode');

/* ---------- Сторінка налаштувань ---------- */

function itc_rozklad_settings_init() {
    register_setting('itc_rozklad', ITC_ROZKLAD_OPTION, [
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default' => '',
    ]);
}
add_action('admin_init', 'itc_rozklad_settings_init');

function itc_rozklad_menu() {
    add_options_page('Розклад ІТ коледжу', 'Розклад ІТ коледжу', 'manage_options', 'itc-rozklad', 'itc_rozklad_settings_page');
}
add_action('admin_menu', 'itc_rozklad_menu');

function itc_rozklad_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    $url = get_option(ITC_ROZKLAD_OPTION, '');
    ?>
    <div class="wrap">
        <h1>Розклад ІТ коледжу</h1>
        <form method="post" action="options.php">
            <?php settings_fields('itc_rozklad'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="itc_rozklad_url">Адреса системи розкладу</label></th>
                    <td>
                        <input name="<?php echo esc_attr(ITC_ROZKLAD_OPTION); ?>" id="itc_rozklad_url" type="url" class="regular-text"
                               placeholder="https://schedule.itcollege.lviv.ua" value="<?php echo esc_attr($url); ?>">
                        <p class="description">Де працює система розкладу (без слеша в кінці).</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
        <h2>Як використовувати</h2>
        <p>Додайте на сторінку «Розклад» блок «Шорткод» з текстом <code>[itcollege_rozklad]</code>.</p>
        <p>Для однієї групи: <code>[itcollege_rozklad group="КІ-21"]</code>.</p>
        <?php if ($url) : ?>
            <p><a class="button" href="<?php echo esc_url(untrailingslashit($url) . '/integration'); ?>" target="_blank" rel="noopener">Перевірити віджет</a></p>
        <?php endif; ?>
    </div>
    <?php
}

/** Посилання «Налаштування» у списку плагінів. */
add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
    array_unshift($links, '<a href="' . esc_url(admin_url('options-general.php?page=itc-rozklad')) . '">Налаштування</a>');
    return $links;
});
