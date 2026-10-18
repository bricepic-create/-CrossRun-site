(async () => {
  const params = new URLSearchParams(location.search);
  // Remove the one-time code from browser history before any asynchronous work.
  history.replaceState(null, '', location.pathname);
  const status = document.getElementById('status');
  try {
    const response = await fetch('https://gmtabfbukfwgdgwdqxue.supabase.co/functions/v1/strava', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', referrerPolicy: 'no-referrer',
      body: JSON.stringify({ action: 'callback', state: params.get('state'), code: params.get('code'), scope: params.get('scope'), error: params.get('error') }),
    });
    status.textContent = response.ok ? 'Strava est connecté. Reviens dans CrossRun pour importer tes courses.' : 'Connexion non validée. Reviens dans CrossRun et relance la connexion avec le compte de test.';
  } catch { status.textContent = 'Connexion impossible. Reviens dans CrossRun et réessaie.'; }
})();
