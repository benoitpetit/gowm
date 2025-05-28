/**
 * Exemple d'utilisation basique de GoWM avec Node.js
 * Ce script démontre comment charger et utiliser un module WASM Go
 */

const { load } = require('../src/index');
const path = require('path');

async function basicExample() {
    console.log('🚀 GoWM - Exemple d\'utilisation basique\n');

    try {
        // Chemin vers le module WASM
        const wasmPath = path.join(__dirname, 'math-wasm', 'main.wasm');

        console.log('📂 Chargement du module WASM:', wasmPath);
        console.log('⏳ Patientez...\n');

        // Charger le module WASM
        const math = await load(wasmPath, {
            name: 'math',
            preInit: true
        });

        // Activer le mode silencieux pour un affichage plus propre
        math.call('setSilentMode', true);

        console.log('✅ Module WASM chargé avec succès!\n');

        // Vérifier les fonctions disponibles
        console.log('📋 Fonctions disponibles:');
        const functions = math.getAvailableFunctions();
        if (Array.isArray(functions)) {
            functions.forEach(func => console.log(`   - ${func}`));
        }
        console.log('');

        // Tests des fonctions mathématiques
        console.log('🧮 Tests des fonctions mathématiques:');

        // Addition
        const sum = math.call('add', 15, 25);
        console.log(`   15 + 25 = ${sum}`);

        // Soustraction
        const diff = math.call('subtract', 100, 30);
        console.log(`   100 - 30 = ${diff}`);

        // Multiplication
        const product = math.call('multiply', 7, 8);
        console.log(`   7 × 8 = ${product}`);

        // Division
        const quotient = math.call('divide', 84, 12);
        console.log(`   84 ÷ 12 = ${quotient}`);

        // Puissance
        const power = math.call('power', 2, 5);
        console.log(`   2^5 = ${power}`);

        // Factorielle
        const factorial = math.call('factorial', 6);
        console.log(`   6! = ${factorial}`);

        console.log('\n🔍 Tests d\'erreurs:');

        // Test division par zéro
        const divByZero = math.call('divide', 10, 0);
        console.log(`   10 ÷ 0 = ${divByZero}`);

        // Test factorielle négative
        const negFactorial = math.call('factorial', -5);
        console.log(`   (-5)! = ${negFactorial}`);

        // Statistiques du module
        console.log('\n📊 Statistiques du module:');
        const stats = math.getStats();
        console.log(`   Fonctions: ${stats.functions.length}`);
        console.log(`   Module prêt: ${stats.ready}`);
        console.log(`   Nom: ${stats.name}`);

        console.log('\n✨ Exemple terminé avec succès!');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error('\n💡 Conseils:');
        console.error('   1. Vérifiez que Go est installé: go version');
        console.error('   2. Compilez le module WASM: cd examples/math-wasm && ./build.sh');
        console.error('   3. Vérifiez que le fichier main.wasm existe');
        process.exit(1);
    }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
    console.error('❌ Erreur non gérée:', error);
    process.exit(1);
});

// Exécuter l'exemple
if (require.main === module) {
    basicExample();
}

module.exports = { basicExample };
