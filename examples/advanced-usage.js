/**
 * Exemple avancé avec plusieurs modules WASM et gestion d'erreurs
 */

const { load, GoWM, listModules, getStats } = require('../src/index');
const path = require('path');

class AdvancedExample {
    constructor() {
        this.gowm = new GoWM();
        this.modules = new Map();
    }

    async loadMathModule() {
        console.log('📐 Chargement du module Math...');

        const wasmPath = path.join(__dirname, 'math-wasm', 'main.wasm');
        const math = await this.gowm.load(wasmPath, {
            name: 'math',
            preInit: true
        });

        this.modules.set('math', math);
        console.log('✅ Module Math chargé');
        return math;
    }

    async demonstrateAsyncCalls() {
        console.log('\n🔄 Démonstration d\'appels asynchrones:');

        const math = this.modules.get('math');
        if (!math) {
            throw new Error('Module math non chargé');
        }

        // Simuler des calculs "coûteux" en parallèle
        const calculations = [
            { op: 'factorial', args: [10], desc: '10!' },
            { op: 'power', args: [3, 4], desc: '3^4' },
            { op: 'multiply', args: [123, 456], desc: '123 × 456' }
        ];

        console.log('   Exécution de calculs en parallèle...');

        const promises = calculations.map(async calc => {
            const start = Date.now();
            const result = await math.callAsync(calc.op, ...calc.args);
            const duration = Date.now() - start;
            return { ...calc, result, duration };
        });

        const results = await Promise.all(promises);

        results.forEach(({ desc, result, duration }) => {
            console.log(`   ${desc} = ${result} (${duration}ms)`);
        });
    }

    async demonstrateErrorHandling() {
        console.log('\n⚠️  Démonstration de gestion d\'erreurs:');

        const math = this.modules.get('math');
        const errorTests = [
            { fn: 'divide', args: [10, 0], desc: 'Division par zéro' },
            { fn: 'factorial', args: [-3], desc: 'Factorielle négative' },
            { fn: 'nonexistent', args: [1, 2], desc: 'Fonction inexistante' }
        ];

        for (const test of errorTests) {
            try {
                const result = math.call(test.fn, ...test.args);
                console.log(`   ${test.desc}: ${result}`);
            } catch (error) {
                console.log(`   ${test.desc}: Erreur capturée - ${error.message}`);
            }
        }
    }

    async demonstrateModuleManagement() {
        console.log('\n🗂️  Gestion des modules:');

        // Lister les modules chargés
        const moduleList = this.gowm.listModules();
        console.log(`   Modules chargés: ${moduleList.join(', ')}`);

        // Obtenir les statistiques
        const allStats = this.gowm.getStats();
        for (const [name, stats] of Object.entries(allStats)) {
            console.log(`   Module "${name}":`);
            console.log(`     - Fonctions: ${stats.functions.join(', ')}`);
            console.log(`     - Prêt: ${stats.ready}`);
            console.log(`     - Nom: ${stats.name}`);
        }
    }

    async demonstrateMemoryManagement() {
        console.log('\n🧹 Démonstration de gestion mémoire:');

        // Charger temporairement un autre module
        console.log('   Chargement d\'un module temporaire...');
        const tempPath = path.join(__dirname, 'math-wasm', 'main.wasm');
        await this.gowm.load(tempPath, { name: 'temp-math' });

        console.log(`   Modules avant nettoyage: ${this.gowm.listModules().join(', ')}`);

        // Décharger le module temporaire
        this.gowm.unload('temp-math');
        console.log(`   Modules après nettoyage: ${this.gowm.listModules().join(', ')}`);
    }

    async runBenchmark() {
        console.log('\n⏱️  Benchmark simple:');

        const math = this.modules.get('math');
        const iterations = 1000;

        console.log(`   Exécution de ${iterations} additions...`);

        // Activer le mode silencieux pour éviter l'affichage de 1000 logs
        math.call('setSilentMode', true);

        const start = Date.now();

        for (let i = 0; i < iterations; i++) {
            math.call('add', i, i + 1);
        }

        // Désactiver le mode silencieux après le benchmark
        math.call('setSilentMode', false);

        const duration = Date.now() - start;
        const avgTime = duration / iterations;

        console.log(`   Temps total: ${duration}ms`);
        console.log(`   Temps moyen par appel: ${avgTime.toFixed(3)}ms`);
        console.log(`   Appels par seconde: ${(1000 / avgTime).toFixed(0)}`);
    }

    async cleanup() {
        console.log('\n🧹 Nettoyage final...');
        this.gowm.unloadAll();
        console.log('   Tous les modules ont été déchargés');
    }

    async run() {
        console.log('🚀 GoWM - Exemple Avancé\n');

        try {
            await this.loadMathModule();
            await this.demonstrateAsyncCalls();
            await this.demonstrateErrorHandling();
            await this.demonstrateModuleManagement();
            await this.demonstrateMemoryManagement();
            await this.runBenchmark();

            console.log('\n✨ Exemple avancé terminé avec succès!');

        } catch (error) {
            console.error('❌ Erreur dans l\'exemple avancé:', error.message);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

async function runAdvancedExample() {
    const example = new AdvancedExample();
    await example.run();
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
    console.error('❌ Erreur non gérée:', error);
    process.exit(1);
});

if (require.main === module) {
    runAdvancedExample();
}

module.exports = { AdvancedExample, runAdvancedExample };
