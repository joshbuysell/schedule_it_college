(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;
  var origin = new URL(script.src).origin;

  function mount(host) {
    if (host.getAttribute("data-itc-mounted")) return;
    host.setAttribute("data-itc-mounted", "1");

    function fromHash() {
      var m = (location.hash.match(/schedule=([^&]+)/) || [])[1];
      return m ? decodeURIComponent(m) : "";
    }
    function src(select) {
      return origin + "/embed" + (select ? "?select=" + encodeURIComponent(select) : "");
    }
    var current = fromHash() || (host.getAttribute("data-group") ? "g:" + host.getAttribute("data-group") : "");

    var iframe = document.createElement("iframe");
    iframe.src = src(current);
    iframe.title = "Розклад занять";
    iframe.setAttribute("scrolling", "no");
    iframe.style.cssText = "display:block;width:100%;height:640px;border:0;overflow:hidden;background:transparent;transition:height .15s ease";
    host.innerHTML = "";
    host.appendChild(iframe);

    var full = false;
    var saved = { css: "", overflow: "", height: "" };
    function setFull(next) {
      if (next === full) return;
      full = next;
      if (full) {
        saved.css = iframe.style.cssText;
        saved.height = iframe.style.height;
        saved.overflow = document.documentElement.style.overflow;
        iframe.style.cssText =
          "position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;border:0;z-index:2147483000;background:#fff;box-shadow:0 0 0 100vmax rgba(0,0,0,.35)";
        iframe.setAttribute("scrolling", "yes");
        document.documentElement.style.overflow = "hidden";
      } else {
        iframe.style.cssText = saved.css;
        iframe.style.height = saved.height;
        iframe.setAttribute("scrolling", "no");
        document.documentElement.style.overflow = saved.overflow;
      }
    }

    window.addEventListener("message", function (e) {
      if (e.origin !== origin || e.source !== iframe.contentWindow) return;
      var d = e.data || {};
      if (d.source !== "itc-schedule") return;
      if (d.type === "height" && d.height > 0 && !full) iframe.style.height = d.height + "px";
      if (d.type === "fullscreen") setFull(!!d.value);
      if (d.type === "select") {
        current = d.value || "";
        var url = location.pathname + location.search + (d.value ? "#schedule=" + encodeURIComponent(d.value) : "");
        history.replaceState(null, "", url);
      }
      if (d.type === "scroll") {
        var top = host.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + top - 80, behavior: "smooth" });
      }
    });

    window.addEventListener("hashchange", function () {
      var next = fromHash();
      if (next && next !== current) {
        current = next;
        iframe.src = src(next);
        host.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  function start() {
    var hosts = document.querySelectorAll("#itc-schedule, [data-itc-schedule]");
    if (!hosts.length && script.parentNode && script.parentNode !== document.head) {
      var div = document.createElement("div");
      script.parentNode.insertBefore(div, script);
      hosts = [div];
    }
    for (var i = 0; i < hosts.length; i++) mount(hosts[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
