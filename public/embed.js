/*!
 * Віджет розкладу ІТ коледжу Львівської політехніки.
 *
 * Вставка на сторінку (WordPress → блок «Власний HTML»):
 *   <div id="itc-rozklad"></div>
 *   <script src="https://<адреса-розкладу>/embed.js" async></script>
 *
 * Необов'язкові атрибути блоку: data-group="КІ-21" — група за замовчуванням.
 * Посилання на конкретну групу: https://itcollege.lviv.ua/rozklad/#rozklad=g:КІ-21
 */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;
  var origin = new URL(script.src).origin;

  function mount(host) {
    if (host.getAttribute("data-itc-mounted")) return;
    host.setAttribute("data-itc-mounted", "1");

    var fromHash = (location.hash.match(/rozklad=([^&]+)/) || [])[1];
    var select = fromHash ? decodeURIComponent(fromHash) : host.getAttribute("data-group") ? "g:" + host.getAttribute("data-group") : "";

    var iframe = document.createElement("iframe");
    iframe.src = origin + "/embed" + (select ? "?select=" + encodeURIComponent(select) : "");
    iframe.title = "Розклад занять";
    iframe.setAttribute("scrolling", "no");
    iframe.style.cssText = "display:block;width:100%;height:640px;border:0;overflow:hidden;background:transparent;transition:height .15s ease";
    host.innerHTML = "";
    host.appendChild(iframe);

    window.addEventListener("message", function (e) {
      if (e.origin !== origin || e.source !== iframe.contentWindow) return;
      var d = e.data || {};
      if (d.source !== "itc-rozklad") return;
      if (d.type === "height" && d.height > 0) iframe.style.height = d.height + "px";
      if (d.type === "select") {
        var url = location.pathname + location.search + (d.value ? "#rozklad=" + encodeURIComponent(d.value) : "");
        history.replaceState(null, "", url);
      }
      if (d.type === "scroll") {
        var top = host.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + top - 80, behavior: "smooth" });
      }
    });
  }

  function start() {
    var hosts = document.querySelectorAll("#itc-rozklad, [data-itc-rozklad]");
    if (!hosts.length && script.parentNode && script.parentNode !== document.head) {
      var div = document.createElement("div");
      script.parentNode.insertBefore(div, script);
      hosts = [div];
    }
    for (var i = 0; i < hosts.length; i++) mount(hosts[i]);
  }

  // async-скрипт може виконатися раніше, ніж браузер дочитає сторінку
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
