const ids = ["percentagem", "fixa", "minimo", "maximo"];

function preencher(config) {
  document.getElementById("percentagem").value = config.percentagem ?? 0;
  document.getElementById("fixa").value = config.fixa ?? 0;
  document.getElementById("minimo").value = config.minimo ?? "";
  document.getElementById("maximo").value = config.maximo ?? "";
}

chrome.storage.sync.get({
  percentagem: 0,
  fixa: 0,
  minimo: null,
  maximo: null
}, preencher);

document.getElementById("guardar").addEventListener("click", async () => {
  const percentagem = Number(document.getElementById("percentagem").value || 0);
  const fixa = Number(document.getElementById("fixa").value || 0);
  const minimoRaw = document.getElementById("minimo").value;
  const maximoRaw = document.getElementById("maximo").value;
  const minimo = minimoRaw === "" ? null : Number(minimoRaw);
  const maximo = maximoRaw === "" ? null : Number(maximoRaw);

  if ([percentagem, fixa, minimo, maximo].some(v => v !== null && (!Number.isFinite(v) || v < 0))) {
    document.getElementById("status").textContent = "Introduz apenas valores válidos e não negativos.";
    return;
  }
  if (percentagem > 100 || (minimo !== null && maximo !== null && minimo > maximo)) {
    document.getElementById("status").textContent = "Verifica a percentagem e os limites mínimo/máximo.";
    return;
  }

  await chrome.storage.sync.set({ percentagem, fixa, minimo, maximo });
  document.getElementById("status").textContent = "Configuração guardada!";
});
