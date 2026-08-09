/**
 * Les seules fonctions du studio qui touchent au DOM.
 *
 * Elles sont isolées ici pour que tout le reste (`defaults`, `generate`,
 * `exchange`, `analysis`) reste importable depuis Node : c'est ce qui permet à
 * la CLI de partager exactement le même cœur que l'interface, sans navigateur.
 * Voir AGENTS.md.
 */

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // `navigator.clipboard` exige un contexte sécurisé ; en HTTP sur le réseau
    // local, ou dans un cadre restreint, il est absent. On retombe sur la
    // vieille méthode.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
