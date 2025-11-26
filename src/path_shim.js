// Custom path shim for browser
// Handles URL joining safely without mangling protocols
export default {
    join: (...args) => {
        // Filter out empty strings
        const parts = args.filter(part => part && typeof part === 'string');
        if (parts.length === 0) return '';

        // Join with forward slash
        let joined = parts.join('/');

        // Replace multiple slashes with single slash, but preserve protocol (http://)
        joined = joined.replace(/([^:]\/)\/+/g, '$1');

        // Ensure no double slashes after protocol if they were lost (though regex above should be safe)
        // But simplistic approach: just fix the protocol if needed
        if (joined.startsWith('http:/') && !joined.startsWith('http://')) {
            joined = joined.replace('http:/', 'http://');
        }
        if (joined.startsWith('https:/') && !joined.startsWith('https://')) {
            joined = joined.replace('https:/', 'https://');
        }

        return joined;
    },
    resolve: (...args) => {
        return args.join('/');
    }
};
