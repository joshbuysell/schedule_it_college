<?php
/**
 * Plugin Name:       Розклад ІТ коледжу
 * Description:       Вбудовує живий розклад занять (групи, викладачі, аудиторії) на сторінки сайту. Шорткод: [itcollege_schedule] або [itcollege_schedule group="КІ-21"].
 * Version:           1.1.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Фаховий коледж інформаційних технологій НУ «Львівська політехніка»
 * License:           GPL-2.0-or-later
 * Text Domain:       itcollege-schedule
 */

if (!defined('ABSPATH')) {
    exit;
}

const ITC_SCHEDULE_OPTION = 'itc_schedule_url';

function itc_schedule_base_url() {
    return untrailingslashit(esc_url_raw(get_option(ITC_SCHEDULE_OPTION, '')));
}

function itc_schedule_shortcode($atts) {
    $atts = shortcode_atts(['group' => ''], $atts, 'itcollege_schedule');
    $base = itc_schedule_base_url();

    if (!$base) {
        return current_user_can('manage_options')
            ? '<p><strong>Розклад:</strong> вкажіть адресу системи в Налаштування → Розклад ІТ коледжу.</p>'
            : '';
    }

    wp_enqueue_script('itc-schedule-embed', $base . '/embed.js', [], '1.1.0', ['strategy' => 'async', 'in_footer' => true]);

    $group = sanitize_text_field($atts['group']);
    $fallback = esc_url($base . '/embed' . ($group ? '?select=' . rawurlencode('g:' . $group) : ''));

    return sprintf(
        '<div class="itc-schedule" data-itc-schedule%s><noscript><iframe src="%s" title="Розклад занять" width="100%%" height="1100" style="border:0"></iframe></noscript></div>',
        $group ? ' data-group="' . esc_attr($group) . '"' : '',
        $fallback
    );
}
add_shortcode('itcollege_schedule', 'itc_schedule_shortcode');

function itc_schedule_changes_shortcode($atts) {
    $atts = shortcode_atts(['link' => '', 'limit' => ''], $atts, 'itcollege_schedule_changes');
    $base = itc_schedule_base_url();
    if (!$base) {
        return '';
    }

    wp_enqueue_script('itc-schedule-embed', $base . '/embed.js', [], '1.1.0', ['strategy' => 'async', 'in_footer' => true]);

    $link = esc_url($atts['link']);
    $limit = absint($atts['limit']);
    return sprintf(
        '<div class="itc-schedule-changes" data-itc-changes%s%s></div>',
        $link ? ' data-link="' . esc_attr($link) . '"' : '',
        $limit ? ' data-limit="' . esc_attr($limit) . '"' : ''
    );
}
add_shortcode('itcollege_schedule_changes', 'itc_schedule_changes_shortcode');

function itc_schedule_settings_init() {
    register_setting('itc_schedule', ITC_SCHEDULE_OPTION, [
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default' => '',
    ]);
}
add_action('admin_init', 'itc_schedule_settings_init');

function itc_schedule_menu() {
    add_options_page('Розклад ІТ коледжу', 'Розклад ІТ коледжу', 'manage_options', 'itc-schedule', 'itc_schedule_settings_page');
}
add_action('admin_menu', 'itc_schedule_menu');

function itc_schedule_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    $url = get_option(ITC_SCHEDULE_OPTION, '');
    ?>
    <div class="wrap">
        <h1>Розклад ІТ коледжу</h1>
        <form method="post" action="options.php">
            <?php settings_fields('itc_schedule'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="itc_schedule_url">Адреса системи розкладу</label></th>
                    <td>
                        <input name="<?php echo esc_attr(ITC_SCHEDULE_OPTION); ?>" id="itc_schedule_url" type="url" class="regular-text"
                               placeholder="https://schedule.itcollege.lviv.ua" value="<?php echo esc_attr($url); ?>">
                        <p class="description">Де працює система розкладу (без слеша в кінці).</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
        <h2>Як використовувати</h2>
        <p>Додайте на сторінку «Розклад» блок «Шорткод» з текстом <code>[itcollege_schedule]</code>.</p>
        <p>Для однієї групи: <code>[itcollege_schedule group="КІ-21"]</code>.</p>
        <p>Блок «Зміни в розкладі» для головної сторінки чи бічної панелі:
            <code>[itcollege_schedule_changes link="<?php echo esc_html(home_url('/schedule/')); ?>"]</code>.
            Параметр <code>link</code> — сторінка з розкладом, куди ведуть посилання на групи.</p>
        <?php if ($url) : ?>
            <p><a class="button" href="<?php echo esc_url(untrailingslashit($url) . '/integration'); ?>" target="_blank" rel="noopener">Перевірити віджет</a></p>
        <?php endif; ?>
    </div>
    <?php
}

add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
    array_unshift($links, '<a href="' . esc_url(admin_url('options-general.php?page=itc-schedule')) . '">Налаштування</a>');
    return $links;
});
