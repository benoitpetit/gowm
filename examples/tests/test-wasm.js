/**
 * Script de test pour vérifier que le module WASM fonctionne correctement
 * Utile pour CI/CD et tests automatisés
 */

const { load } = require('../../src/index');
const path = require('path');

class WasmTester {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async runTests() {
        console.log('🧪 GoWM - Tests du module WASM\n');

        const wasmPath = path.join(__dirname, '..', 'wasm-modules', 'math-wasm', 'main.wasm');

        try {
            console.log('📂 Chargement du module WASM...');
            const math = await load(wasmPath, { name: 'test-math' });
            console.log('✅ Module chargé avec succès\n');

            for (const test of this.tests) {
                await this.runSingleTest(test, math);
            }

            this.printSummary();

        } catch (error) {
            console.error('❌ Erreur de chargement du module:', error.message);
            console.error('\n💡 Assurez-vous de compiler le module WASM:');
            console.error('   cd examples/wasm-modules/math-wasm && ./build.sh\n');
            process.exit(1);
        }
    }

    async runSingleTest(test, math) {
        try {
            console.log(`🔍 Test: ${test.name}`);
            await test.testFn(math);
            console.log(`✅ PASS: ${test.name}\n`);
            this.passed++;
        } catch (error) {
            console.log(`❌ FAIL: ${test.name}`);
            console.log(`   Erreur: ${error.message}\n`);
            this.failed++;
        }
    }

    printSummary() {
        const total = this.passed + this.failed;
        console.log('📊 Résumé des tests:');
        console.log(`   Total: ${total}`);
        console.log(`   Réussis: ${this.passed}`);
        console.log(`   Échoués: ${this.failed}`);

        if (this.failed === 0) {
            console.log('\n🎉 Tous les tests sont passés!');
            process.exit(0);
        } else {
            console.log('\n💥 Certains tests ont échoué');
            process.exit(1);
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message} - Attendu: ${expected}, Reçu: ${actual}`);
        }
    }
}

// Créer le testeur
const tester = new WasmTester();

// Tests basiques des fonctions mathématiques
tester.addTest('Addition basique', (math) => {
    const result = math.call('add', 5, 3);
    tester.assertEqual(result, 8, 'Addition 5 + 3');
});

tester.addTest('Soustraction basique', (math) => {
    const result = math.call('subtract', 10, 4);
    tester.assertEqual(result, 6, 'Soustraction 10 - 4');
});

tester.addTest('Multiplication basique', (math) => {
    const result = math.call('multiply', 6, 7);
    tester.assertEqual(result, 42, 'Multiplication 6 × 7');
});

tester.addTest('Division basique', (math) => {
    const result = math.call('divide', 15, 3);
    tester.assertEqual(result, 5, 'Division 15 ÷ 3');
});

tester.addTest('Puissance basique', (math) => {
    const result = math.call('power', 2, 3);
    tester.assertEqual(result, 8, 'Puissance 2^3');
});

tester.addTest('Factorielle basique', (math) => {
    const result = math.call('factorial', 5);
    tester.assertEqual(result, 120, 'Factorielle 5!');
});

// Tests des cas limites
tester.addTest('Addition avec zéros', (math) => {
    const result = math.call('add', 0, 0);
    tester.assertEqual(result, 0, 'Addition 0 + 0');
});

tester.addTest('Multiplication par zéro', (math) => {
    const result = math.call('multiply', 42, 0);
    tester.assertEqual(result, 0, 'Multiplication par zéro');
});

tester.addTest('Puissance de 1', (math) => {
    const result = math.call('power', 5, 1);
    tester.assertEqual(result, 5, 'Puissance n^1');
});

tester.addTest('Factorielle de 0', (math) => {
    const result = math.call('factorial', 0);
    tester.assertEqual(result, 1, 'Factorielle 0!');
});

tester.addTest('Factorielle de 1', (math) => {
    const result = math.call('factorial', 1);
    tester.assertEqual(result, 1, 'Factorielle 1!');
});

// Tests d'erreurs
tester.addTest('Division par zéro', (math) => {
    const result = math.call('divide', 10, 0);
    tester.assert(
        typeof result === 'string' && result.includes('Erreur'),
        'Division par zéro doit retourner une erreur'
    );
});

tester.addTest('Factorielle négative', (math) => {
    const result = math.call('factorial', -5);
    tester.assert(
        typeof result === 'string' && result.includes('Erreur'),
        'Factorielle négative doit retourner une erreur'
    );
});

// Tests de nombres décimaux
tester.addTest('Addition décimale', (math) => {
    const result = math.call('add', 1.5, 2.3);
    tester.assert(
        Math.abs(result - 3.8) < 0.0001,
        'Addition décimale 1.5 + 2.3'
    );
});

tester.addTest('Division décimale', (math) => {
    const result = math.call('divide', 7, 2);
    tester.assertEqual(result, 3.5, 'Division décimale 7 ÷ 2');
});

// Tests asynchrones
tester.addTest('Appel asynchrone addition', async (math) => {
    const result = await math.callAsync('add', 100, 200);
    tester.assertEqual(result, 300, 'Appel asynchrone addition');
});

tester.addTest('Appel asynchrone factorielle', async (math) => {
    const result = await math.callAsync('factorial', 6);
    tester.assertEqual(result, 720, 'Appel asynchrone factorielle 6!');
});

// Test des fonctions disponibles
tester.addTest('Liste des fonctions', (math) => {
    const functions = math.call('getAvailableFunctions');
    tester.assert(Array.isArray(functions), 'getAvailableFunctions doit retourner un tableau');
    tester.assert(functions.length > 0, 'Le tableau des fonctions ne doit pas être vide');
    tester.assert(functions.includes('add'), 'La fonction add doit être disponible');
    tester.assert(functions.includes('factorial'), 'La fonction factorial doit être disponible');
});

// Test de performance simple
tester.addTest('Performance - 1000 additions', (math) => {
    const start = Date.now();

    // Activer le mode silencieux pour les tests de performance
    math.call('setSilentMode', true);

    for (let i = 0; i < 1000; i++) {
        math.call('add', i, i + 1);
    }

    // Désactiver le mode silencieux
    math.call('setSilentMode', false);

    const duration = Date.now() - start;
    console.log(`   ⏱️  1000 additions exécutées en ${duration}ms`);

    tester.assert(duration < 5000, 'Les 1000 additions doivent prendre moins de 5 secondes');
});

// Test de gestion d'erreurs pour fonction inexistante
tester.addTest('Fonction inexistante', (math) => {
    try {
        math.call('nonexistentFunction', 1, 2);
        tester.assert(false, 'Appel de fonction inexistante devrait lever une exception');
    } catch (error) {
        tester.assert(true, 'Exception correctement levée pour fonction inexistante');
    }
});

// Exécuter tous les tests
if (require.main === module) {
    tester.runTests();
}

module.exports = WasmTester;
