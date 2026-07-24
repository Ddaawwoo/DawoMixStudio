const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".panel")];
const status = document.querySelector("#status");
const badge = document.querySelector("#transferBadge");

function showPanel(id) {
  tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.target === id));
  panels.forEach(panel => panel.classList.toggle("active", panel.id === id));
  if (id === "cueflow") badge.hidden = true;
}

tabs.forEach(tab => tab.addEventListener("click", () => showPanel(tab.dataset.target)));

window.DawoMixStudio = {
  async transferPlaylist(playlist) {
    const cueflow = document.querySelector("#cueflow");
    const bridge = cueflow.contentWindow?.CueflowBridge;
    if (!bridge) {
      status.textContent = "CUEFLOW se ještě načítá…";
      setTimeout(() => window.DawoMixStudio.transferPlaylist(playlist), 500);
      return;
    }
    status.textContent = `Přenáším „${playlist.name}“…`;
    try {
      const count = await bridge.importPlaylist(playlist);
      status.textContent = `Přeneseno: ${playlist.name} (${count} skladeb)`;
      badge.hidden = false;
      showPanel("cueflow");
    } catch (error) {
      console.error(error);
      status.textContent = "Přenos se nezdařil";
      alert(`Playlist se nepodařilo přenést: ${error.message}`);
    }
  },
  async transferToDawomix(payload) {
    const dawomix = document.querySelector("#dawomix");
    const bridge = dawomix.contentWindow?.DawomixBridge;
    if (!bridge) throw new Error("Dawomix ještě není připravený");
    status.textContent = `Posílám ${payload.tracks.length} skladeb do Dawomix…`;
    const result = await bridge.importFromCueflow(payload);
    status.textContent = `Dawomix: vytvořen playlist „${result.name}“`;
    showPanel("dawomix");
    return result;
  }
};
