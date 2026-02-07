/**
 * JSON/XML Processing GoWM Example - Advanced JSON/XML WASM Module
 * 
 * Demonstrates loading and using a Go Wasm module
 * for advanced JSON/XML processing operations from GitHub repository.
 * 
 * v1.4.0: Metadata exploitation, SHA256 integrity, function validation
 * v1.3.0: Cache, retry, streaming, compression support
 */

const { GoWM } = require('../../src/index.js');

async function main() {
    const gowm = new GoWM({ logLevel: 'info' });

    try {
        // Load jsonxml-wasm module from GitHub repository
        // v1.4.0: module.json metadata fetched, integrity verified
        console.log('Loading JSON/XML WASM module...');
        const jsonxml = await gowm.loadFromGitHub('benoitpetit/wasm-modules-repository', {
            path: 'jsonxml-wasm',
            filename: 'main.wasm',
            name: 'jsonxml-wasm',
            cache: false // force fresh download
        });
        console.log('JSON/XML module loaded successfully\n');

        // Test data
        const testJson = '{"greeting": "hello", "target": "world", "number": 42}';
        const testXml = '<root><greeting>hello</greeting><target>world</target><number>42</number></root>';

        console.log('🔄 Testing JSON to XML conversion...');
        console.log(`📥 Input JSON: ${testJson}`);
        
        // JSON to XML conversion
        const xmlResult = jsonxml.call('jsonToXML', testJson);
        if (xmlResult.error) {
            console.error('❌ JSON to XML conversion failed:', xmlResult.error);
        } else {
            console.log('✅ JSON to XML conversion successful!');
            console.log(`📤 Generated XML (${xmlResult.size} bytes):`);
            console.log(xmlResult.data);
        }

        console.log('\n🔄 Testing XML to JSON conversion...');
        console.log(`📥 Input XML: ${testXml}`);
        
        // XML to JSON conversion
        const jsonResult = jsonxml.call('xmlToJSON', testXml);
        if (jsonResult.error) {
            console.error('❌ XML to JSON conversion failed:', jsonResult.error);
        } else {
            console.log('✅ XML to JSON conversion successful!');
            console.log(`📤 Generated JSON (${jsonResult.size} bytes):`);
            console.log(jsonResult.data);
        }

        console.log('\n🔄 Testing custom root element...');
        const customXmlResult = jsonxml.call('jsonToXML', testJson, 'data');
        if (customXmlResult.error) {
            console.error('❌ Custom root conversion failed:', customXmlResult.error);
        } else {
            console.log('✅ Custom root conversion successful!');
            console.log(`📤 Generated XML with custom root "${customXmlResult.root}":`);
            console.log(customXmlResult.data);
        }

        // v1.4.0: Module metadata
        console.log('\n=== Module Metadata (v1.4.0) ===');
        const metadata = gowm.getModuleMetadata('jsonxml-wasm');
        if (metadata) {
            console.log(`Module: ${metadata.name} v${metadata.version}`);
            console.log(`Documented functions: ${metadata.functions?.length || 0}`);
        }

        // v1.4.0: Describe a function
        const desc = gowm.describeFunction('jsonxml-wasm', 'jsonToXML');
        if (desc) {
            console.log(`\n${desc.name}: ${desc.description}`);
            console.log(`Parameters: ${desc.parameters?.map(p => `${p.name} (${p.type})`).join(', ')}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main }; 