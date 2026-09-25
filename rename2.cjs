const fs = require('fs');
const files = [
    'pages/admin/ManageStaff.tsx',
    'pages/admin/GenericAdminMock.tsx',
    'pages/Profile.tsx',
    'pages/ForgotPassword.tsx',
    'pages/ProductDetails.tsx',
    'pages/SignIn.tsx',
    'pages/BlogDetails.tsx',
    'pages/Home.tsx',
    'pages/BlogList.tsx',
    'pages/SignUp.tsx',
    'components/AdminLayout.tsx',
    'App.tsx'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/vibe\.shop/g, 'deep.shop');
        content = content.replace(/Vibe\.Shop/g, 'Deep.Shop');
        fs.writeFileSync(file, content);
    }
});
