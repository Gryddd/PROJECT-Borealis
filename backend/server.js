require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');
const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const VERIFIED_SENDER = 'info@gourideche.com'

app.use(cors());
app.use(express.json());
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

function isAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
    next();
}

let db;
async function connectToDb() {
    try {
        const client = new MongoClient(DATABASE_URL);
        await client.connect();
        db = client.db('borealisStore');
        console.log('Successfully connected to MongoDB Atlas!');
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        process.exit(1);
    }
}

function escapeRegex(string) {
    return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

app.post('/api/auth/register', async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) { return res.status(400).json({ error: 'Name, email, and password are required.' }); }
        const existingUser = await db.collection('users').findOne({ email: email });
        if (existingUser) { return res.status(409).json({ error: 'An account with this email already exists.' }); }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { name, email, password: hashedPassword, role: 'customer', createdAt: new Date() };
        const result = await db.collection('users').insertOne(newUser);
        res.status(201).json({ message: 'User created successfully!', userId: result.insertedId });
    } catch (error) {
        console.error('Error in user registration:', error);
        res.status(500).json({ error: 'Failed to register user.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const { email, password } = req.body;
        if (!email || !password) { return res.status(400).json({ error: 'Email and password are required.' }); }
        const user = await db.collection('users').findOne({ email: email });
        if (!user) { return res.status(401).json({ error: 'Invalid credentials.' }); }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(401).json({ error: 'Invalid credentials.' }); }
        const payload = { userId: user._id, name: user.name, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ message: 'Logged in successfully!', token: token });
    } catch (error) {
        console.error('Error in user login:', error);
        res.status(500).json({ error: 'Failed to log in.' });
    }
});
app.post('/api/auth/forgot-password', async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const { email } = req.body;
        const user = await db.collection('users').findOne({ email });

        if (!user) {
            return res.json({ message: 'If a user with that email exists, a password reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const passwordResetExpires = new Date(Date.now() + 3600000);

        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { passwordResetToken: resetToken, passwordResetExpires } }
        );

        const resetURL = `http://127.0.0.1:5500/frontend/reset-password.html?token=${resetToken}`;

        const msg = {
            to: user.email,
            from: VERIFIED_SENDER,
            subject: 'Borealis Password Reset Request',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h1>You requested a password reset</h1>
                    <p>Click the link below to reset your password. This link will expire in one hour.</p>
                    <a href="${resetURL}" style="display: inline-block; padding: 10px 20px; background-color: #D4AF37; color: #111; text-decoration: none; border-radius: 5px;">Reset Your Password</a>
                    <p>If you did not request this, please ignore this email.</p>
                </div>
            `,
        };

        await sgMail.send(msg);

        res.json({ message: 'If a user with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('Error in forgot-password:', error);
        res.status(500).json({ error: 'An internal error occurred.' });
    }
});


app.post('/api/auth/forgot-password', async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const { email } = req.body;
        const user = await db.collection('users').findOne({ email });

        if (!user) {
            return res.json({ message: 'If a user with that email exists, a password reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const passwordResetExpires = new Date(Date.now() + 3600000);

        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { passwordResetToken: resetToken, passwordResetExpires } }
        );

        const resetURL = `http://127.0.0.1:5500/reset-password.html?token=${resetToken}`;

        const msg = {
            to: user.email,
            from: VERIFIED_SENDER,
            subject: 'Borealis Password Reset Request',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; text-align: center;">
                    <h1 style="color: #111;">Password Reset Request</h1>
                    <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
                    <p>Please click on the button below, or paste the following link into your browser to complete the process:</p>
                    <p><a href="${resetURL}">${resetURL}</a></p>
                    <a href="${resetURL}" style="display: inline-block; margin: 10px 0; padding: 12px 25px; background-color: #D4AF37; color: #111; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Your Password</a>
                    <p>This password reset link is only valid for the next 60 minutes.</p>
                    <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
                </div>
            `,
        };

        await sgMail.send(msg);
        console.log(`Password reset email sent successfully to ${user.email}`);

        res.json({ message: 'If a user with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('Error in forgot-password:', error);
        if (error.response) {
            console.error(error.response.body)
        }
        res.status(500).json({ error: 'An internal error occurred.' });
    }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const userId = req.user.userId;
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const userId = req.user.userId;
        const orders = await db.collection('orders').find({ userId: new ObjectId(userId) }).sort({ createdAt: -1 }).toArray();
        res.json(orders);
    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ error: 'Failed to fetch order history.' });
    }
});

app.get('/api/products', async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const { category } = req.query;
        const filter = {};
        if (category) {
            filter.category = category;
        }
        const products = await db.collection('products').find(filter).toArray();
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.get('/api/categories', async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const categories = await db.collection('products').distinct('category');
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

app.get('/api/products/search', async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: 'Search query is required.' });
        const escapedQuery = escapeRegex(query);
        const products = await db.collection('products').find({ name: { $regex: '^' + escapedQuery, $options: 'i' } }).limit(8).toArray();
        res.json(products);
    } catch (error) {
        console.error('Error during product search:', error);
        res.status(500).json({ error: 'Failed to search for products' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const productId = req.params.id;
        if (!ObjectId.isValid(productId)) return res.status(400).json({ error: 'Invalid product ID format.' });
        const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (error) {
        console.error('Error fetching single product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

app.post('/api/products', authenticateToken, isAdmin, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const newProduct = req.body;
        if (!newProduct.name || !newProduct.price || newProduct.countInStock === undefined) {
            return res.status(400).json({ error: 'Name, price, and countInStock are required fields.' });
        }
        const result = await db.collection('products').insertOne(newProduct);
        res.status(201).json({ message: 'Product created successfully!', newProduct: { _id: result.insertedId, ...newProduct } });
    } catch (error) {
        console.error('Error in POST /api/products:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

app.put('/api/products/:id', authenticateToken, isAdmin, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const productId = req.params.id;
        if (!ObjectId.isValid(productId)) return res.status(400).json({ error: 'Invalid product ID format.' });
        const result = await db.collection('products').updateOne({ _id: new ObjectId(productId) }, { $set: req.body });
        if (result.matchedCount === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product updated successfully!', modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error('Error in PUT /api/products/:id:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

app.delete('/api/products/:id', authenticateToken, isAdmin, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const productId = req.params.id;
        if (!ObjectId.isValid(productId)) return res.status(400).json({ error: 'Invalid product ID format.' });
        const result = await db.collection('products').deleteOne({ _id: new ObjectId(productId) });
        if (result.deletedCount === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted successfully!', deletedCount: result.deletedCount });
    } catch (error) {
        console.error('Error in DELETE /api/products/:id:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});


app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const orders = await db.collection('orders').aggregate([
            { $sort: { createdAt: -1 } },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userDetails' } },
            { $unwind: '$userDetails' },
            { $project: { 'userDetails.password': 0 } }
        ]).toArray();
        res.json(orders);
    } catch (error) {
        console.error('Admin: Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders.' });
    }
});

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
        res.json(users);
    } catch (error) {
        console.error('Admin: Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});
app.put('/api/admin/orders/:id', authenticateToken, isAdmin, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const { id: orderId } = req.params;
        const { status, trackingNumber } = req.body;

        if (!ObjectId.isValid(orderId)) {
            return res.status(400).json({ error: 'Invalid Order ID format.' });
        }
        if (!status) {
            return res.status(400).json({ error: 'Status is a required field.' });
        }

        const updateDoc = {
            $set: {
                status: status,
                trackingNumber: trackingNumber !== undefined ? trackingNumber : ""
            }
        };

        const result = await db.collection('orders').updateOne(
            { _id: new ObjectId(orderId) },
            updateDoc
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        res.json({ message: 'Order updated successfully!' });

    } catch (error) {
        console.error('Admin: Error updating order:', error);
        res.status(500).json({ error: 'Failed to update order.' });
    }
});


app.get('/api/cart', authenticateToken, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const userId = req.user.userId;
        const cartItems = await db.collection('cartItems').find({ userId: new ObjectId(userId) }).toArray();
        res.json(cartItems);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cart items' });
    }
});

app.post('/api/cart', authenticateToken, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const { productId } = req.body;
        const userId = req.user.userId;
        if (!productId || !ObjectId.isValid(productId)) return res.status(400).json({ error: 'Valid Product ID is required' });
        const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        if (product.countInStock <= 0) {
            return res.status(400).json({ error: 'Sorry, this product is out of stock.' });
        }
        const existingItem = await db.collection('cartItems').findOne({ productId: new ObjectId(productId), userId: new ObjectId(userId) });
        if (existingItem) {
            await db.collection('cartItems').updateOne({ _id: existingItem._id }, { $inc: { quantity: 1 } });
            res.json({ message: 'Item quantity updated!' });
        } else {
            const newCartItem = { userId: new ObjectId(userId), productId: product._id, name: product.name, price: product.price, imageUrl: product.imageUrl, quantity: 1 };
            await db.collection('cartItems').insertOne(newCartItem);
            res.status(201).json({ message: 'Item added to cart!', item: newCartItem });
        }
    } catch (error) {
        console.error('Error in POST /api/cart:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});

app.post('/api/cart/merge', authenticateToken, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const userId = new ObjectId(req.user.userId);
        const guestCartItems = req.body.cartItems;

        if (!Array.isArray(guestCartItems) || guestCartItems.length === 0) {
            return res.json({ message: 'No items to merge.' });
        }
        
        const userCartItems = await db.collection('cartItems').find({ userId }).toArray();
        const userCartMap = new Map(userCartItems.map(item => [item.productId.toString(), item]));

        for (const guestItem of guestCartItems) {
            const guestProductId = new ObjectId(guestItem.productId);
            const product = await db.collection('products').findOne({ _id: guestProductId });

            if (!product || product.countInStock <= 0) {
                console.log(`Skipping merge for out-of-stock or non-existent product: ${guestItem.productId}`);
                continue; 
            }

            const existingUserItem = userCartMap.get(guestItem.productId);

            if (existingUserItem) {
                await db.collection('cartItems').updateOne(
                    { _id: existingUserItem._id },
                    { $inc: { quantity: guestItem.quantity } }
                );
            } else {
                const newCartItem = {
                    userId,
                    productId: product._id,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.imageUrl,
                    quantity: guestItem.quantity
                };
                await db.collection('cartItems').insertOne(newCartItem);
            }
        }

        res.json({ message: 'Cart merged successfully!' });

    } catch (error) {
        console.error('Error merging cart:', error);
        res.status(500).json({ error: 'Failed to merge cart.' });
    }
});


app.delete('/api/cart/:id', authenticateToken, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const cartItemId = req.params.id;
        const userId = req.user.userId;
        if (!ObjectId.isValid(cartItemId)) return res.status(400).json({ error: 'Invalid cart item ID.' });
        const filter = { _id: new ObjectId(cartItemId), userId: new ObjectId(userId) };
        const item = await db.collection('cartItems').findOne(filter);
        if (!item) return res.status(404).json({ error: 'Cart item not found' });
        if (item.quantity > 1) {
            await db.collection('cartItems').updateOne(filter, { $inc: { quantity: -1 } });
            res.json({ message: 'Item quantity decreased' });
        } else {
            await db.collection('cartItems').deleteOne(filter);
            res.json({ message: 'Item removed from cart' });
        }
    } catch (error) {
        console.error('Error processing remove request:', error);
        res.status(500).json({ error: 'Failed to process remove request' });
    }
});

app.put('/api/cart/:id/increment', authenticateToken, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const cartItemId = req.params.id;
        const userId = req.user.userId;
        if (!ObjectId.isValid(cartItemId)) return res.status(400).json({ error: 'Invalid cart item ID.' });
        const filter = { _id: new ObjectId(cartItemId), userId: new ObjectId(userId) };
        const result = await db.collection('cartItems').updateOne(filter, { $inc: { quantity: 1 } });
        if (result.matchedCount === 0) return res.status(404).json({ error: 'Cart item not found' });
        res.json({ message: 'Item quantity increased' });
    } catch (error) {
        console.error('Error incrementing item quantity:', error);
        res.status(500).json({ error: 'Failed to update item quantity' });
    }
});


app.post('/api/orders', authenticateToken, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const userId = new ObjectId(req.user.userId);
        const { shippingAddress } = req.body;

        if (!shippingAddress || !shippingAddress.phoneNumber) {
            return res.status(400).json({ error: 'Shipping address with a phone number is required.' });
        }

        const cartItems = await db.collection('cartItems').find({ userId }).toArray();
        if (cartItems.length === 0) return res.status(400).json({ error: 'Your cart is empty.' });
        
        let totalPrice = 0;
        cartItems.forEach(item => {
            const price = parseFloat(item.price.replace('$', ''));
            totalPrice += price * item.quantity;
        });

        const newOrder = { 
            userId, 
            items: cartItems, 
            totalPrice: totalPrice.toFixed(2), 
            shippingAddress, 
            status: 'Pending', 
            trackingNumber: '',
            createdAt: new Date() 
        };

        const result = await db.collection('orders').insertOne(newOrder);

        for (const item of cartItems) {
            await db.collection('products').updateOne(
                { _id: item.productId },
                { $inc: { countInStock: -item.quantity } }
            );
        }

        try {
            const user = await db.collection('users').findOne({ _id: userId });
            const itemsHtml = newOrder.items.map(item => 
                `<li>${item.name} (x${item.quantity}) - ${item.price}</li>`
            ).join('');

            const msg = {
                to: user.email,
                from: VERIFIED_SENDER, 
                subject: `Borealis Order Confirmation - #${result.insertedId}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
                        <h1 style="color: #111;">Thank you for your order, ${user.name}!</h1>
                        <p>We've received your order and will begin processing it shortly. You'll receive another notification once your order has shipped.</p>
                        <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Order Summary (ID: ${result.insertedId})</h3>
                        <ul>${itemsHtml}</ul>
                        <hr>
                        <p style="font-size: 1.2em; text-align: right;"><strong>Total: $${newOrder.totalPrice}</strong></p>
                        <h3>Shipping Address</h3>
                        <p>
                            ${newOrder.shippingAddress.fullName}<br>
                            ${newOrder.shippingAddress.address}<br>
                            ${newOrder.shippingAddress.city}, ${newOrder.shippingAddress.postalCode}
                        </p>
                    </div>
                `,
            };
            await sgMail.send(msg);
            console.log('Confirmation email sent successfully to', user.email);
        } catch (emailError) {
            console.error('Error sending confirmation email:', emailError.response ? emailError.response.body : emailError);
        }

        await db.collection('cartItems').deleteMany({ userId });
        res.status(201).json({ message: 'Order placed successfully!', orderId: result.insertedId });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ error: 'Failed to place order.' });
    }
});


app.post('/api/create-payment-intent', authenticateToken, async (req, res) => {
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const userId = new ObjectId(req.user.userId);
        const cartItems = await db.collection('cartItems').find({ userId }).toArray();
        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Cannot create payment for an empty cart.' });
        }
        let totalPrice = 0;
        cartItems.forEach(item => {
            const price = parseFloat(item.price.replace('$', ''));
            totalPrice += price * item.quantity;
        });
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalPrice * 100),
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
        });
        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).json({ error: 'Failed to create payment intent.' });
    }
});

async function startServer() {
    await connectToDb();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

startServer();