#!/usr/bin/env node

const { load } = require('../../src/index');
const fs = require('fs');
const path = require('path');

/**
 * Script de conversion d'image vers WebP optimisé
 * 
 * Usage: node convert-to-webp.js <image_path> [quality]
 * 
 * Exemples:
 *   node convert-to-webp.js photo.jpg
 *   node convert-to-webp.js image.png 80
 */

async function convertImageToWebP(imagePath, quality = 75) {
    try {
        // Vérifier que le fichier existe
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Fichier non trouvé: ${imagePath}`);
        }

        console.log('🖼️  Conversion d\'image vers WebP');
        console.log('================================\n');
        console.log('💡 Note: Utilise une simulation WebP avec compression JPEG optimisée\n');

        // Charger le module WASM d'images
        console.log('📂 Chargement du module WASM...');
        const wasmPath = path.resolve(__dirname, '..', 'wasm-modules', 'image-wasm', 'main.wasm');
        const imageWasm = await load(wasmPath, { 
            name: 'imageProcessor' 
        });
        console.log('✅ Module WASM chargé\n');

        // Lire le fichier image
        console.log(`📖 Lecture de l'image: ${imagePath}`);
        const imageBuffer = fs.readFileSync(imagePath);
        const imageData = new Uint8Array(imageBuffer);
        console.log(`   Taille originale: ${imageBuffer.length} octets`);

        // Obtenir les informations de l'image
        const imageInfo = imageWasm.call('getImageInfo', imageData);
        if (typeof imageInfo === 'string' && imageInfo.includes('Error')) {
            throw new Error(`Image invalide: ${imageInfo}`);
        }

        if (imageInfo.width && imageInfo.height) {
            console.log(`   Format: ${imageInfo.format}`);
            console.log(`   Dimensions: ${imageInfo.width}x${imageInfo.height}px`);
        }

        // Convertir vers format WebP (simulé avec compression JPEG optimisée)
        console.log(`\n🔄 Conversion vers WebP (qualité: ${quality})...`);
        console.log('   Note: WebP simulé avec compression JPEG optimisée');
        const webpData = imageWasm.call('convertToWebP', imageData, quality);
        
        if (typeof webpData === 'string' && webpData.includes('Error')) {
            throw new Error(`Erreur de conversion: ${webpData}`);
        }

        // Générer le nom de fichier de sortie avec extension .webp
        const parsedPath = path.parse(imagePath);
        const outputPath = path.join(parsedPath.dir, `${parsedPath.name}.webp`);

        // Sauvegarder le fichier converti
        console.log(`💾 Sauvegarde: ${outputPath}`);
        const outputBuffer = Buffer.from(webpData);
        fs.writeFileSync(outputPath, outputBuffer);

        // Calculer la réduction de taille
        const originalSize = imageBuffer.length;
        const optimizedSize = outputBuffer.length;
        const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

        console.log('\n📊 Résultats:');
        console.log(`   Taille originale: ${originalSize} octets`);
        console.log(`   Taille WebP: ${optimizedSize} octets`);
        console.log(`   Réduction: ${reduction}%`);
        console.log(`   Format: WebP simulé (JPEG optimisé)`);
        console.log(`   Fichier sauvé: ${outputPath}`);

        console.log('\n🎉 Conversion WebP terminée avec succès!');

    } catch (error) {
        console.error('\n❌ Erreur lors de la conversion:');
        console.error(`   ${error.message}`);
        process.exit(1);
    }
}

function showUsage() {
    console.log('🖼️  Convertisseur d\'images WebP');
    console.log('================================\n');
    console.log('💡 Ce script simule WebP avec compression JPEG optimisée\n');
    console.log('Usage:');
    console.log('  node convert-to-webp.js <chemin_image> [qualité]\n');
    console.log('Paramètres:');
    console.log('  chemin_image  Chemin vers l\'image à convertir');
    console.log('  qualité       Qualité de compression (1-100, défaut: 75)\n');
    console.log('Exemples:');
    console.log('  node convert-to-webp.js photo.jpg');
    console.log('  node convert-to-webp.js image.png 80');
    console.log('  node convert-to-webp.js ../images/photo.jpeg 60\n');
    console.log('Formats supportés:');
    console.log('  - JPEG (.jpg, .jpeg)');
    console.log('  - PNG (.png)');
    console.log('  - Autres formats supportés par Go image\n');
    console.log('Note technique:');
    console.log('  Le format WebP n\'étant pas nativement supporté par Go WASM,');
    console.log('  ce script utilise une compression JPEG optimisée qui produit');
    console.log('  des fichiers .webp avec une qualité et taille comparables.');
}

// Point d'entrée principal
async function main() {
    const args = process.argv.slice(2);

    // Vérifier les arguments
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showUsage();
        return;
    }

    const imagePath = args[0];
    const quality = args[1] ? parseInt(args[1], 10) : 75;

    // Valider la qualité
    if (quality < 1 || quality > 100) {
        console.error('❌ Erreur: La qualité doit être entre 1 et 100');
        process.exit(1);
    }

    // Vérifier que le chemin est fourni
    if (!imagePath) {
        console.error('❌ Erreur: Veuillez spécifier le chemin de l\'image');
        showUsage();
        process.exit(1);
    }

    await convertImageToWebP(imagePath, quality);
}

// Exécuter le script
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Erreur fatale:', error.message);
        process.exit(1);
    });
}

module.exports = { convertImageToWebP }; 