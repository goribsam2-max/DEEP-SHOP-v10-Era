const fs = require('fs');
const glob = require('glob');

// We use glob or just a simple recursive search since we know the exact files from grep
const files = [
    'pages/admin/ManageConfig.tsx',
    'pages/admin/ManageSEO.tsx',
    'pages/admin/ManageVGHelpline.tsx',
    'pages/ProductDetails.tsx',
    'pages/Profile.tsx',
    'pages/Home.tsx',
    'pages/Messages.tsx',
    'components/FloatingChat.tsx',
    'components/InstallPwaGuide.tsx',
    'components/GifGenerator.ts',
    'components/GlobalCallReceiver.tsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/Vibe Gadgets/g, 'Deep Shop');
    content = content.replace(/Vibe Gadget/g, 'Deep Shop');
    fs.writeFileSync(file, content);
});
