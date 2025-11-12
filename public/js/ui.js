// Minimal UI helpers for admin forms
(function(){
  function toggleByCheckbox(cb){
    var sel = cb.getAttribute('data-toggle-target');
    if (!sel) return;
    var el = document.querySelector(sel);
    if (!el) return;
    el.hidden = !cb.checked;
  }
  document.addEventListener('change', function(e){
    if (e.target && e.target.matches('[data-toggle-target]')) {
      toggleByCheckbox(e.target);
    }
  });
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('[data-toggle-target]').forEach(toggleByCheckbox);
  });
})();

