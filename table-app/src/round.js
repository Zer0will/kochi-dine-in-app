export async function requestRound(payload, request = fetch) {
  const response = await request('/api/round', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Round preview unavailable. Try again.');
  const result = await response.json();
  if (result.ok !== true || !result.roundId) throw new Error('The preview was not accepted. Try again.');
  return result;
}
