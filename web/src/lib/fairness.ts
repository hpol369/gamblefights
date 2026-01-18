

/**
 * Calculates the game outcome based on seeds.
 * Returns { isPlayerAWin: boolean, hash: string }
 * NOTE: reliable crypto module is needed. In browser, use Web Crypto API or a library.
 * This example uses Node's crypto for simplicity if running SS, but for client-side we need Web Crypto.
 */

export async function verifyOutcome(serverSeed: string, clientSeed: string, nonce: number) {
    const message = `${clientSeed}-${nonce}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(serverSeed);
    const msgData = encoder.encode(message);

    const key = await crypto.subtle.importKey(
        'raw',
        keyData as BufferSource,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, msgData as BufferSource);
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Logic: First 8 chars -> int -> % 2
    const subHash = hashHex.substring(0, 8);
    const decValue = parseInt(subHash, 16);
    const isPlayerAWin = decValue % 2 === 0;

    return {
        isPlayerAWin,
        hash: hashHex,
        decValue
    };
}
