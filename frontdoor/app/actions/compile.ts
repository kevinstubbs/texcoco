'use server'

export async function compileContract(code: string) {
    try {
        const response = await fetch('http://localhost:3001/compile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Compilation error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to compile contract'
        };
    }
} 