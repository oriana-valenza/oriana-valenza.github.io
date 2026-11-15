/* Boutons « Copier » des modèles de demande à l'IA. Aucune donnée envoyée nulle part. */
document.querySelectorAll('.modele').forEach((bloc) => {
  const bouton = bloc.querySelector('.copier'), texte = bloc.querySelector('pre');
  if (!bouton || !texte) return;
  bouton.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(texte.textContent); bouton.textContent = 'Copié !'; }
    catch { const r = document.createRange(); r.selectNodeContents(texte); getSelection().removeAllRanges(); getSelection().addRange(r); bouton.textContent = 'Sélectionné : appuie sur Copier dans le menu'; }
    setTimeout(() => { bouton.textContent = 'Copier'; }, 3000);
  });
});
