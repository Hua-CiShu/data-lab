import { DataStore, Modules } from '../core.js';
import { renderTablePreview } from '../app.js';

Modules.set('clean', function(){
  const view = document.getElementById('view');
  view.innerHTML = `
    <h2 class="h">数据清洗</h2>
    <div id="preview" class="card"></div>
  `;
  renderTablePreview();
});
