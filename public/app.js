const API_URL = '/api';

const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const authBtn = document.getElementById('auth-btn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const authTitle = document.getElementById('auth-subtitle');
const authSwitchText = document.getElementById('auth-switch-text');
const logoutBtn = document.getElementById('logout-btn');
const loggedInUserSpan = document.getElementById('logged-in-user');
const createPostForm = document.getElementById('create-post-form');
const postsContainer = document.getElementById('posts-container');

let isLoginMode = true;

function setupModeSwitcher() {
    const switchModeBtn = document.getElementById('switch-mode');
    if (switchModeBtn) {
        switchModeBtn.replaceWith(switchModeBtn.cloneNode(true));
        document.getElementById('switch-mode').addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            if (isLoginMode) {
                authTitle.textContent = 'Sign in to your blog account';
                authBtn.textContent = 'Login';
                authSwitchText.innerHTML = 'Don\'t have an account? <a href="#" id="switch-mode" style="color: #38bdf8;">Register</a>';
            } else {
                authTitle.textContent = 'Create a new blog account';
                authBtn.textContent = 'Register';
                authSwitchText.innerHTML = 'Already have an account? <a href="#" id="switch-mode" style="color: #38bdf8;">Login</a>';
            }
            setupModeSwitcher();
        });
    }
}
setupModeSwitcher();

authBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (!username || !password) return alert('Fill in all fields');

    const endpoint = isLoginMode ? `${API_URL}/auth/login` : `${API_URL}/auth/register`;
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        if (isLoginMode) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            checkAuth();
        } else {
            alert('Registered successfully! Please login.');
            isLoginMode = true;
            authTitle.textContent = 'Sign in to your blog account';
            authBtn.textContent = 'Login';
            setupModeSwitcher();
        }
    } catch (err) {
        alert(err.message);
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    checkAuth();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token) {
        authSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        loggedInUserSpan.textContent = `👤 ${username}`;
        fetchPosts();
    } else {
        authSection.style.display = 'flex';
        dashboardSection.style.display = 'none';
        usernameInput.value = '';
        passwordInput.value = '';
    }
}

async function fetchPosts() {
    try {
        const res = await fetch(`${API_URL}/posts`);
        const posts = await res.json();
        renderPosts(posts);
    } catch (err) {
        console.error(err);
    }
}

function renderPosts(posts) {
    postsContainer.innerHTML = '';
    const currentUsername = localStorage.getItem('username');

    if (posts.length === 0) {
        postsContainer.innerHTML = '<p>No blog posts yet. Be the first to write one!</p>';
        return;
    }

    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';
        const isAuthor = post.author && post.author.username === currentUsername;

        let commentsHtml = '';
        post.comments.forEach(c => {
            commentsHtml += `
                <div class="comment-item">
                    <div class="comment-meta"><strong>${c.author ? c.author.username : 'Unknown'}</strong> • ${new Date(c.createdAt).toLocaleDateString()}</div>
                    <div>${c.content}</div>
                </div>
            `;
        });

        card.innerHTML = `
            <h3 class="post-title">${post.title}</h3>
            <div class="post-meta">By ${post.author ? post.author.username : 'Unknown'} on ${new Date(post.createdAt).toLocaleDateString()}</div>
            <div class="post-content">${post.content}</div>
            
            ${isAuthor ? `<button onclick="deletePost('${post._id}')" class="btn danger" style="margin-bottom: 1rem; padding: 4px 8px; font-size: 0.8rem;">Delete Post</button>` : ''}

            <div class="comments-section">
                <h4>Comments (${post.comments.length})</h4>
                <div style="margin: 0.75rem 0;">${commentsHtml}</div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <input type="text" id="comment-input-${post._id}" placeholder="Write a comment..." style="flex:1; padding: 0.5rem; background:#0f172a; border:1px solid #334155; color:white; border-radius:4px;">
                    <button onclick="addComment('${post._id}')" class="btn primary" style="padding: 0.5rem 1rem;">Post</button>
                </div>
            </div>
        `;
        postsContainer.appendChild(card);
    });
}

createPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;

    try {
        const res = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title, content })
        });
        if (!res.ok) throw new Error('Failed to create post');
        createPostForm.reset();
        fetchPosts();
    } catch (err) {
        alert(err.message);
    }
});

window.deletePost = async function(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete post');
        fetchPosts();
    } catch (err) {
        alert(err.message);
    }
};

window.addComment = async function(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ content })
        });
        if (!res.ok) throw new Error('Failed to add comment');
        input.value = '';
        fetchPosts();
    } catch (err) {
        alert(err.message);
    }
};

checkAuth();