// 全局变量
let currentZoom = 100;
let currentBackground = 'gradient1';

// ===== 导出相关常量 =====
// 控制导出清晰度的缩放倍数范围
const EXPORT_MIN_SCALE = 2;
const EXPORT_MAX_SCALE = 3;

function getPreferredExportScale() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlScale = parseFloat(urlParams.get('scale'));
        const storedScale = parseFloat(localStorage.getItem('madopic_export_scale'));
        const base = Number.isFinite(urlScale)
            ? urlScale
            : (Number.isFinite(storedScale)
                ? storedScale
                : Math.max(2, window.devicePixelRatio || 1));
        return Math.min(EXPORT_MAX_SCALE, Math.max(EXPORT_MIN_SCALE, base));
    } catch (_) {
        return Math.max(EXPORT_MIN_SCALE, Math.min(EXPORT_MAX_SCALE, 2));
    }
}

const EXPORT_SCALE = getPreferredExportScale();

// 预设背景渐变
const backgroundPresets = {
    gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gradient2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    gradient3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    gradient4: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    gradient5: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    gradient6: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    gradient7: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    gradient8: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
};

// DOM 元素
const markdownInput = document.getElementById('markdownInput');
const posterContent = document.getElementById('posterContent');
const markdownPoster = document.getElementById('markdownPoster');
const previewContent = document.getElementById('previewContent');
const customPanel = document.getElementById('customPanel');
const overlay = document.getElementById('overlay');
const zoomLevel = document.querySelector('.zoom-level');

// 新增设置变量
let currentFontSize = 16;
let currentPadding = 40;
let currentWidth = 640;
let currentMode = 'free'; // 'free' | 'xhs' | 'pyq'
let fixedHeights = { xhs: null, pyq: null }; // 等待用户提供后设置

// 图片数据存储
const imageDataStore = new Map();

// 预览渲染状态
let hasInitialPreviewRendered = false;
let lastRenderedMarkdown = '';

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    updatePreview();
});

// 初始化应用
function initializeApp() {
    // 配置 marked 选项
    marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false,
        highlight: function(code, lang) {
            return code;
        }
    });
    
    // 设置初始背景
    applyBackground(backgroundPresets[currentBackground]);
    
    // 应用初始设置
    applyFontSize(currentFontSize);
    applyPadding(currentPadding);
    applyWidth(currentWidth);
    
    // 更新缩放显示
    updateZoomDisplay();
}

// 设置事件监听器
function setupEventListeners() {
    // Markdown 输入监听
    // 更平滑的输入预览：稍延长防抖并在输入结束时仅渲染一次
    markdownInput.addEventListener('input', debounce(updatePreview, 250));
    
    // 工具栏按钮
    setupToolbarButtons();
    
    // 缩放控制
    document.getElementById('zoomIn').addEventListener('click', zoomIn);
    document.getElementById('zoomOut').addEventListener('click', zoomOut);
    
    // 自定义面板
    document.getElementById('customBtn').addEventListener('click', openCustomPanel);
    document.getElementById('cancelCustom').addEventListener('click', closeCustomPanel);
    document.getElementById('applyCustom').addEventListener('click', applyCustomSettings);
    overlay.addEventListener('click', closeCustomPanel);

    // 滑块事件监听
    setupSliders();
    
    // 导出功能
    document.getElementById('exportBtn').addEventListener('click', exportToPNG);
    setupModeButtons();
    
    // 背景预设选择
    setupBackgroundPresets();
    
    // 自定义颜色输入
    setupColorInputs();
    
    // 图片处理
    setupImageHandlers();
    
    // 键盘快捷键
    setupKeyboardShortcuts();
}

// 模式按钮绑定
function setupModeButtons() {
    const group = document.getElementById('modeGroup');
    if (!group) return;
    group.querySelectorAll('button[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            setMode(mode);
        });
    });
}

function setMode(mode) {
    if (!['free', 'xhs', 'pyq'].includes(mode)) return;
    currentMode = mode;
    // 切换按钮激活态
    const group = document.getElementById('modeGroup');
    if (group) {
        group.querySelectorAll('button[data-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
        });
    }
    // 预览区域视觉反馈（仅预览容器外层，不改导出逻辑）
    applyPreviewModeFrame();
}

function applyPreviewModeFrame() {
    // 预览时根据模式设置固定可视高度（以外层 markdownPoster 的 box 包含 padding 与内容）
    markdownPoster.dataset.mode = currentMode;
    if (currentMode === 'xhs') {
        // 3:4（宽:高） => 高度 = 宽度 / 3 * 4。由于 width 是含 padding 的可视宽度，这里与导出一致
        const rect = markdownPoster.getBoundingClientRect();
        const targetHeight = Math.round((rect.width / 3) * 4);
        markdownPoster.style.height = `${targetHeight}px`;
        markdownPoster.style.minHeight = `${targetHeight}px`;
        markdownPoster.style.overflow = 'hidden'; // 超出裁掉

        // 计算可用给白卡片（posterContent）的最大高度，保留上下紫色 padding
        const mpComputed = getComputedStyle(markdownPoster);
        const paddingTop = parseFloat(mpComputed.paddingTop) || 0;
        const paddingBottom = parseFloat(mpComputed.paddingBottom) || 0;
        const innerMax = Math.max(0, targetHeight - paddingTop - paddingBottom);
        posterContent.style.maxHeight = `${innerMax}px`;
        posterContent.style.overflow = 'hidden';
    } else if (currentMode === 'pyq') {
        // 朋友圈固定比例：1290x2796 ≈ 宽:高 = 1290:2796。
        // 在保持当前外层宽度不变的前提下，按该比例计算高度。
        const rect = markdownPoster.getBoundingClientRect();
        const targetHeight = Math.round(rect.width * (2796 / 1290));
        markdownPoster.style.height = `${targetHeight}px`;
        markdownPoster.style.minHeight = `${targetHeight}px`;
        markdownPoster.style.overflow = 'hidden';

        const mpComputed = getComputedStyle(markdownPoster);
        const paddingTop = parseFloat(mpComputed.paddingTop) || 0;
        const paddingBottom = parseFloat(mpComputed.paddingBottom) || 0;
        const innerMax = Math.max(0, targetHeight - paddingTop - paddingBottom);
        posterContent.style.maxHeight = `${innerMax}px`;
        posterContent.style.overflow = 'hidden';
    } else {
        markdownPoster.style.height = '';
        markdownPoster.style.minHeight = '600px';
        markdownPoster.style.overflow = 'hidden';
        posterContent.style.maxHeight = '';
        posterContent.style.overflow = '';
    }
}

// 设置工具栏按钮
function setupToolbarButtons() {
    document.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleToolbarAction(action);
        });
    });
}

// 处理工具栏动作
function handleToolbarAction(action) {
    const textarea = markdownInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    
    let insertText = '';
    let cursorPos = start;
    
    switch(action) {
        case 'bold':
            insertText = `**${selectedText || '粗体文本'}**`;
            cursorPos = start + (selectedText ? insertText.length : 2);
            break;
        case 'italic':
            insertText = `*${selectedText || '斜体文本'}*`;
            cursorPos = start + (selectedText ? insertText.length : 1);
            break;
        case 'heading':
            insertText = `## ${selectedText || '标题'}`;
            cursorPos = start + (selectedText ? insertText.length : 3);
            break;
        case 'list':
            insertText = `\n- ${selectedText || '列表项'}`;
            cursorPos = start + (selectedText ? insertText.length : 3);
            break;
        case 'link':
            insertText = `[${selectedText || '链接文本'}](https://example.com)`;
            cursorPos = start + (selectedText ? insertText.length : 1);
            break;
        case 'image':
            insertImage();
            return;
        case 'empty-line':
            // 插入可在预览中可见的“Markdown 空行”占位段落
            insertText = `\n\n<p class="md-empty-line">&nbsp;</p>\n\n`;
            cursorPos = start + insertText.length;
            break;
        case 'clear':
            textarea.value = '';
            updatePreview();
            textarea.focus();
            return;
    }
    
    textarea.value = beforeText + insertText + afterText;
    textarea.setSelectionRange(cursorPos, cursorPos);
    textarea.focus();
    updatePreview();
}

// 更新预览
function updatePreview() {
    const markdownText = markdownInput.value.trim();
    
    // 检查是否为空内容
    if (!markdownText) {
        showEmptyPreview();
        return;
    }
    
    // 替换简化的base64为完整版本进行预览
    const processedMarkdown = replaceImageDataForPreview(markdownText);
    // 仅在已完成至少一次渲染后，且内容确实未变化时跳过
    if (hasInitialPreviewRendered && processedMarkdown === lastRenderedMarkdown) {
        return;
    }
    lastRenderedMarkdown = processedMarkdown;

    let htmlContent = '';
    try {
        htmlContent = marked.parse(processedMarkdown);
    } catch (err) {
        console.error('Markdown 渲染失败: ', err);
        htmlContent = '<p style="color:#ef4444">渲染失败，请检查 Markdown 内容。</p>';
    }
    posterContent.innerHTML = htmlContent;
    // 注意：预览阶段不强制设置跨域属性，避免某些图床因 CORS 导致直接加载失败
    
    // 确保内容容器可见
    posterContent.style.display = 'block';
    
    // 重新应用当前的字体大小设置
    applyFontSize(currentFontSize);
    
    // 仅首次渲染使用淡入动画，后续输入不再触发，避免屏闪
    if (!hasInitialPreviewRendered) {
        posterContent.style.animation = 'fadeIn 0.3s ease';
        hasInitialPreviewRendered = true;
    } else {
        posterContent.style.animation = '';
    }
}

// 显示空内容提示
function showEmptyPreview() {
    posterContent.innerHTML = `
        <div class="empty-preview">
            <div class="empty-icon">
                <i class="fab fa-markdown"></i>
            </div>
            <h3>开始创作吧！</h3>
            <p>在左侧编辑器中输入 Markdown 内容</p>
            <div class="empty-tips">
                <div class="tip-item">
                    <i class="fas fa-lightbulb"></i>
                    <span>支持标题、列表、链接、图片等格式</span>
                </div>
                <div class="tip-item">
                    <i class="fas fa-keyboard"></i>
                    <span>使用工具栏快捷按钮快速插入格式</span>
                </div>
                <div class="tip-item">
                    <i class="fas fa-palette"></i>
                    <span>点击"自定义"按钮调整背景和样式</span>
                </div>
            </div>
        </div>
    `;
    hasInitialPreviewRendered = false;
}

// 为图片元素设置跨域与防盗链相关属性
function applyImageAttributes(root) {
    const imgs = root.querySelectorAll('img');
    imgs.forEach((img) => {
        try {
            if (!img.getAttribute('crossorigin')) {
                img.setAttribute('crossorigin', 'anonymous');
            }
            if (!img.getAttribute('referrerpolicy')) {
                img.setAttribute('referrerpolicy', 'no-referrer');
            }
            if (!img.getAttribute('decoding')) {
                img.setAttribute('decoding', 'sync');
            }
            if (!img.getAttribute('loading')) {
                img.setAttribute('loading', 'eager');
            }
        } catch (_) {
            // 忽略单个图片设置失败
        }
    });
}

// 缩放控制
function zoomIn() {
    if (currentZoom < 150) {
        currentZoom += 25;
        applyZoom();
    }
}

function zoomOut() {
    if (currentZoom > 50) {
        currentZoom -= 25;
        applyZoom();
    }
}

function applyZoom() {
    previewContent.className = 'preview-content';
    if (currentZoom !== 100) {
        previewContent.classList.add(`zoom-${currentZoom}`);
    }
    updateZoomDisplay();
}

function updateZoomDisplay() {
    zoomLevel.textContent = `${currentZoom}%`;
}

// 自定义面板
function openCustomPanel() {
    customPanel.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCustomPanel() {
    customPanel.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function setupBackgroundPresets() {
    document.querySelectorAll('.bg-preset').forEach(preset => {
        preset.addEventListener('click', function() {
            // 移除其他选中状态
            document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
            // 添加选中状态
            this.classList.add('active');
            currentBackground = this.getAttribute('data-bg');
        });
    });
}

function setupColorInputs() {
    const colorStart = document.getElementById('colorStart');
    const colorEnd = document.getElementById('colorEnd');
    const gradientDirection = document.getElementById('gradientDirection');
    
    [colorStart, colorEnd, gradientDirection].forEach(input => {
        input.addEventListener('change', function() {
            // 取消预设选择
            document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
            currentBackground = 'custom';
        });
    });
}

function applyCustomSettings() {
    // 应用背景设置
    let backgroundCSS;
    if (currentBackground === 'custom') {
        const colorStart = document.getElementById('colorStart').value;
        const colorEnd = document.getElementById('colorEnd').value;
        const direction = document.getElementById('gradientDirection').value;
        backgroundCSS = `linear-gradient(${direction}, ${colorStart} 0%, ${colorEnd} 100%)`;
    } else {
        backgroundCSS = backgroundPresets[currentBackground];
    }
    applyBackground(backgroundCSS);
    
    // 应用字体大小设置
    currentFontSize = parseFloat(document.getElementById('fontSizeSlider').value);
    applyFontSize(currentFontSize);
    
    // 应用边距设置
    currentPadding = parseFloat(document.getElementById('paddingSlider').value);
    applyPadding(currentPadding);
    
    // 应用宽度设置
    currentWidth = parseInt(document.getElementById('widthSlider').value);
    applyWidth(currentWidth);
    
    closeCustomPanel();
    
    // 显示成功提示
    showNotification('设置已更新！', 'success');
}

function applyBackground(backgroundCSS) {
    markdownPoster.style.background = backgroundCSS;
}

function applyFontSize(fontSize) {
    // 使用CSS变量统一管理字体大小，避免大量DOM操作
    posterContent.style.setProperty('--dynamic-font-size', `${fontSize}px`);
    posterContent.style.setProperty('--dynamic-h1-size', `${Math.round(fontSize * 1.75)}px`);
    posterContent.style.setProperty('--dynamic-h2-size', `${Math.round(fontSize * 1.375)}px`);
    posterContent.style.setProperty('--dynamic-h3-size', `${Math.round(fontSize * 1.125)}px`);
    posterContent.style.setProperty('--dynamic-h4-size', `${Math.round(fontSize * 1.05)}px`);
    posterContent.style.setProperty('--dynamic-h5-h6-size', `${Math.round(fontSize * 0.95)}px`);
    posterContent.style.setProperty('--dynamic-code-size', `${Math.round(fontSize * 0.875)}px`);
    posterContent.style.setProperty('--dynamic-quote-size', `${Math.round(fontSize * 0.95)}px`);
}

function applyPadding(padding) {
    // 调整外层容器的内边距，即图片中红色箭头指向的边距
    markdownPoster.style.padding = `${padding}px`;
}

function applyWidth(width) {
    // 调整预览区的整体宽度（导出图片的宽度）
    markdownPoster.style.width = `${width}px`;
}

function setupSliders() {
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const paddingSlider = document.getElementById('paddingSlider');
    const paddingValue = document.getElementById('paddingValue');
    const widthSlider = document.getElementById('widthSlider');
    const widthValue = document.getElementById('widthValue');
    
    // 字体大小滑块
    fontSizeSlider.addEventListener('input', function() {
        const value = parseFloat(this.value);
        fontSizeValue.textContent = `${value}px`;
        // 实时预览
        applyFontSize(value);
    });
    
    // 边距滑块
    paddingSlider.addEventListener('input', function() {
        const value = parseFloat(this.value);
        paddingValue.textContent = `${value}px`;
        // 实时预览
        applyPadding(value);
    });
    
    // 宽度滑块
    widthSlider.addEventListener('input', function() {
        const value = this.value;
        widthValue.textContent = `${value}px`;
        // 实时预览
        applyWidth(parseInt(value));
    });
    
    // 初始化滑块值显示
    fontSizeValue.textContent = `${fontSizeSlider.value}px`;
    paddingValue.textContent = `${paddingSlider.value}px`;
    widthValue.textContent = `${widthSlider.value}px`;
}


// ===== 导出相关工具 =====
/**
 * 创建一个与预览完全一致的离屏克隆节点用于导出。
 * 关键点：同步计算样式与实际渲染宽度，并统一为 border-box，避免行宽与换行偏差。
 * 返回被追加到 body 的节点，调用方负责移除。
 */
function createExactExportNode() {
    const clone = markdownPoster.cloneNode(true);
    clone.id = 'madopic-export-poster';
    const mpComputed = getComputedStyle(markdownPoster);
    Object.assign(clone.style, {
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        margin: '0',
        width: `${markdownPoster.getBoundingClientRect().width}px`,
        padding: mpComputed.padding,
        boxSizing: 'border-box',
        background: markdownPoster.style.background || mpComputed.background,
        transform: 'none'
    });
    // 移除内部动画/滤镜但不改变布局
    const inner = clone.querySelector('.poster-content');
    if (inner) {
        const pcComputed = getComputedStyle(posterContent);
        inner.style.animation = 'none';
        inner.style.width = `${posterContent.getBoundingClientRect().width}px`;
        inner.style.padding = pcComputed.padding;
        inner.style.boxSizing = 'border-box';
        inner.style.backdropFilter = pcComputed.backdropFilter || 'none';
        inner.style.webkitBackdropFilter = pcComputed.webkitBackdropFilter || 'none';
    }
    // 固定高度模式：小红书 3:4。导出时必须与预览一致，且裁掉超出部分
    if (currentMode === 'xhs') {
        const rect = markdownPoster.getBoundingClientRect();
        const target = Math.round((rect.width / 3) * 4);
        clone.style.height = `${target}px`;
        clone.style.minHeight = `${target}px`;
        clone.style.overflow = 'hidden';

        // 同步内部白卡片最大高度，保留上下紫色 padding 作为边距
        const mpComputed = getComputedStyle(markdownPoster);
        const paddingTop = parseFloat(mpComputed.paddingTop) || 0;
        const paddingBottom = parseFloat(mpComputed.paddingBottom) || 0;
        const innerMax = Math.max(0, target - paddingTop - paddingBottom);
        const inner = clone.querySelector('.poster-content');
        if (inner) {
            inner.style.maxHeight = `${innerMax}px`;
            inner.style.overflow = 'hidden';
        }
    } else if (currentMode === 'pyq') {
        const rect = markdownPoster.getBoundingClientRect();
        const target = Math.round(rect.width * (2796 / 1290));
        clone.style.height = `${target}px`;
        clone.style.minHeight = `${target}px`;
        clone.style.overflow = 'hidden';

        const mpComputed = getComputedStyle(markdownPoster);
        const paddingTop = parseFloat(mpComputed.paddingTop) || 0;
        const paddingBottom = parseFloat(mpComputed.paddingBottom) || 0;
        const innerMax = Math.max(0, target - paddingTop - paddingBottom);
        const inner = clone.querySelector('.poster-content');
        if (inner) {
            inner.style.maxHeight = `${innerMax}px`;
            inner.style.overflow = 'hidden';
        }
    }
    document.body.appendChild(clone);
    return clone;
}

/**
 * 确保导出节点中的所有图片都可被 html2canvas 捕获。
 * 做法：为每个 <img> 设置 crossorigin/referrerpolicy，并强制等待加载完毕。
 */
async function prepareImagesForExport(root) {
    const images = Array.from(root.querySelectorAll('img'));
    const loadPromises = images.map((img) => new Promise((resolve) => {
        try {
            // 仅导出阶段设置跨域与防盗链（避免影响预览）
            img.setAttribute('crossorigin', 'anonymous');
            img.setAttribute('referrerpolicy', 'no-referrer');
            // 若已完成加载则直接 resolve
            if (img.complete && img.naturalWidth > 0) return resolve();
            // 监听加载/失败
            const clean = () => {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
            };
            const onLoad = () => { clean(); resolve(); };
            const onError = () => {
                clean();
                // 第一次失败，尝试代理加速/绕过 CORS 防盗链
                tryProxyImage(img).finally(resolve);
            };
            img.addEventListener('load', onLoad, { once: true });
            img.addEventListener('error', onError, { once: true });
            // 触发重新加载（给 src 加一个无副作用查询串）。
            // 对 data: 协议不处理；对 blob: 协议尝试转成 dataURL（html2canvas 不抓取跨上下文 blob）
            try {
                if (img.src.startsWith('data:')) {
                    // 已是 dataURL，无需处理
                } else if (img.src.startsWith('blob:')) {
                    // 尝试将 blob 读取为 dataURL
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', img.src, true);
                    xhr.responseType = 'blob';
                    xhr.onload = () => {
                        try {
                            const reader = new FileReader();
                            reader.onload = () => { img.src = reader.result; };
                            reader.onerror = () => {};
                            reader.readAsDataURL(xhr.response);
                        } catch (_) {}
                    };
                    xhr.onerror = () => {};
                    xhr.send();
                } else {
                    const url = new URL(img.src, window.location.href);
                    url.searchParams.set('madopic_cache_bust', Date.now().toString());
                    img.src = url.href;
                }
            } catch (_) {
                // 若 URL 构造失败则忽略
            }
        } catch (_) {
            resolve();
        }
    }));
    await Promise.race([
        Promise.allSettled(loadPromises),
        new Promise((resolve) => setTimeout(resolve, 3000)) // 最多等待 3s，避免卡死
    ]);
}

/**
 * 若图片加载失败，尝试通过公共图片代理服务加载，提升导出命中率。
 * 代理：images.weserv.nl（仅用于 http/https 且跨源情况）。
 */
function tryProxyImage(img) {
    return new Promise((resolve) => {
        try {
            if (img.dataset.madopicProxied === '1') return resolve();
            const original = new URL(img.src, window.location.href);
            // 同源或 data/blob 不代理
            if (original.origin === window.location.origin) return resolve();
            if (original.protocol !== 'http:' && original.protocol !== 'https:') return resolve();

            // 构造代理 URL（去掉协议）
            const hostless = original.href.replace(/^https?:\/\//i, '');
            // 代理默认会设置允许跨域，附带 no-referrer。若原图为 https，确保代理也为 https
            const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(hostless)}&n=-1&output=png`;

            const onLoad = () => { cleanup(); resolve(); };
            const onError = () => { cleanup(); resolve(); };
            const cleanup = () => {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
            };

            img.addEventListener('load', onLoad, { once: true });
            img.addEventListener('error', onError, { once: true });
            img.dataset.madopicProxied = '1';
            img.setAttribute('crossorigin', 'anonymous');
            img.setAttribute('referrerpolicy', 'no-referrer');
            img.src = proxied;
        } catch (_) {
            resolve();
        }
    });
}

/**
 * 导出为 PNG（通过克隆节点离屏渲染，保证与预览一致）。
 * 流程：等待字体 → 克隆节点 → 读取尺寸 → html2canvas 渲染 → 透明边缘裁剪 → 触发下载 → 清理。
 */
async function exportToPNG() {
    let exportNode = null;
    try {
        showNotification('正在生成图片...', 'info');
        exportNode = createExactExportNode();

        // 预处理导出节点中的图片：设置跨域/防盗链属性并强制重新加载，尽量保证可被 html2canvas 捕获
        try {
            await prepareImagesForExport(exportNode);
        } catch (_) {
            // 忽略单个图片处理失败
        }

        // 等待字体与一帧渲染
        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (_) {}
        }
        await new Promise(r => requestAnimationFrame(r));

        const rect = exportNode.getBoundingClientRect();
        const targetWidth = Math.ceil(rect.width);
        const targetHeight = Math.ceil(rect.height);

        const tryScales = getExportScaleCandidates(EXPORT_SCALE);
        const canvas = await renderWithFallbackScales(exportNode, targetWidth, targetHeight, tryScales);

        // 固定高度模式下无需透明边裁剪，避免破坏目标尺寸；自由模式可裁剪空白
        const trimmedCanvas = currentMode === 'free' ? trimTransparentEdges(canvas) : null;
        const outputCanvas = trimmedCanvas || canvas;

        const link = document.createElement('a');
        link.download = `madopic-${getFormattedTimestamp()}.png`;
        link.href = outputCanvas.toDataURL('image/png', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('图片导出成功！', 'success');
    } catch (error) {
        console.error('导出失败:', error);
        showNotification('导出失败，请重试', 'error');
    } finally {
        if (exportNode && exportNode.parentNode) {
            exportNode.parentNode.removeChild(exportNode);
        }
    }
}

/**
 * 生成按优先级降序的导出 scale 备选列表。
 * 例如：首选 s，然后尝试 2、1.5、1.25、1。
 */
function getExportScaleCandidates(preferred) {
    const candidates = [preferred, 2, 1.5, 1.25, 1];
    const unique = [];
    for (const s of candidates) {
        if (Number.isFinite(s) && s > 0 && !unique.includes(s)) unique.push(s);
    }
    return unique.sort((a, b) => b - a);
}

/**
 * 尝试按多个缩放倍数依次渲染，直到成功为止。
 */
async function renderWithFallbackScales(node, targetWidth, targetHeight, scales) {
    let lastError = null;
    for (const scale of scales) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const canvas = await html2canvas(node, {
                backgroundColor: null,
                scale,
                useCORS: true,
                allowTaint: true,
                logging: false,
                width: targetWidth,
                height: targetHeight,
                windowWidth: targetWidth,
                windowHeight: targetHeight,
                scrollX: 0,
                scrollY: 0,
                imageTimeout: 15000,
                onclone: function(clonedDoc) {
                    const clonedTarget = clonedDoc.getElementById('madopic-export-poster');
                    if (clonedTarget) {
                        clonedTarget.style.setProperty('position', 'absolute', 'important');
                        clonedTarget.style.setProperty('top', '0', 'important');
                        clonedTarget.style.setProperty('left', '0', 'important');
                        clonedTarget.style.setProperty('margin', '0', 'important');
                        clonedTarget.style.setProperty('width', `${currentWidth}px`, 'important');
                        clonedTarget.style.setProperty('padding', `${currentPadding}px`, 'important');
                        clonedTarget.style.setProperty('box-sizing', 'border-box', 'important');
                    }
                    // 再次为克隆文档内的图片设置跨域/防盗链属性（双保险）
                    try {
                        clonedDoc.querySelectorAll('img').forEach((img) => {
                            if (!img.getAttribute('crossorigin')) img.setAttribute('crossorigin', 'anonymous');
                            if (!img.getAttribute('referrerpolicy')) img.setAttribute('referrerpolicy', 'no-referrer');
                            if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'sync');
                            if (!img.getAttribute('loading')) img.setAttribute('loading', 'eager');
                        });
                    } catch (_) {}
                    clonedDoc.documentElement.style.setProperty('overflow', 'hidden', 'important');
                    clonedDoc.body.style.setProperty('margin', '0', 'important');
                    clonedDoc.body.style.setProperty('padding', '0', 'important');
                }
            });
            if (scale !== scales[0]) {
                showNotification(`显存不足，已自动降至 ${Math.round(scale * 100)}% 清晰度导出`, 'warning');
            }
            return canvas;
        } catch (err) {
            lastError = err;
            // 继续尝试下一个较低的 scale
        }
    }
    throw lastError || new Error('所有缩放倍数均导出失败');
}

// ===== 通知系统 =====
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // 添加样式
    Object.assign(notification.style, {
        position: 'fixed',
        top: '80px',
        right: '20px',
        background: getNotificationColor(type),
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        zIndex: '10000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        fontSize: '14px',
        fontWeight: '500'
    });
    
    notification.querySelector('.notification-content').style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    document.body.appendChild(notification);
    
    // 动画显示
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };
    return colors[type] || colors.info;
}

// ===== 键盘快捷键 =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'b':
                    e.preventDefault();
                    handleToolbarAction('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    handleToolbarAction('italic');
                    break;
                case 's':
                    e.preventDefault();
                    exportToPNG();
                    break;
                case '=':
                case '+':
                    e.preventDefault();
                    zoomIn();
                    break;
                case '-':
                    e.preventDefault();
                    zoomOut();
                    break;
            }
        }
        
        // ESC 键关闭面板
        if (e.key === 'Escape') {
            closeCustomPanel();
        }
    });
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}



// ===== 错误处理 =====
window.addEventListener('error', function(e) {
    console.error('应用错误:', e.error);
    showNotification('应用出现错误，请刷新页面重试', 'error');
});

// 页面可见性改变时优化性能
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // 页面隐藏时暂停某些操作
    } else {
        // 页面可见时恢复操作
        updatePreview();
    }
});

// 添加一些实用的格式化快捷方法
const MarkdownHelper = {
    // 插入表格
    insertTable: function(rows = 3, cols = 3) {
        const textarea = markdownInput;
        let table = '\n| ';
        
        // 表头
        for (let i = 0; i < cols; i++) {
            table += `列${i + 1} | `;
        }
        table += '\n| ';
        
        // 分隔线
        for (let i = 0; i < cols; i++) {
            table += '--- | ';
        }
        table += '\n';
        
        // 数据行
        for (let row = 0; row < rows - 1; row++) {
            table += '| ';
            for (let col = 0; col < cols; col++) {
                table += '数据 | ';
            }
            table += '\n';
        }
        
        const cursorPos = textarea.selectionStart;
        const beforeText = textarea.value.substring(0, cursorPos);
        const afterText = textarea.value.substring(cursorPos);
        
        textarea.value = beforeText + table + afterText;
        textarea.setSelectionRange(cursorPos + table.length, cursorPos + table.length);
        updatePreview();
    },
    
    // 插入代码块
    insertCodeBlock: function(language = '') {
        const textarea = markdownInput;
        const codeBlock = `\n\`\`\`${language}\n// 在这里输入代码\nconsole.log('Hello World!');\n\`\`\`\n`;
        
        const cursorPos = textarea.selectionStart;
        const beforeText = textarea.value.substring(0, cursorPos);
        const afterText = textarea.value.substring(cursorPos);
        
        textarea.value = beforeText + codeBlock + afterText;
        textarea.setSelectionRange(cursorPos + 4 + language.length, cursorPos + 4 + language.length);
        updatePreview();
    }
};

// 图片处理相关函数
function insertImage() {
    const imageInput = document.getElementById('imageInput');
    imageInput.click();
}

function setupImageHandlers() {
    const imageInput = document.getElementById('imageInput');
    
    // 文件选择处理
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
        // 清空输入，允许选择同一文件
        e.target.value = '';
    });
    
    // 剪贴板粘贴图片处理
    markdownInput.addEventListener('paste', function(e) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    handleImageFile(file);
                }
                break;
            }
        }
    });
}

function handleImageFile(file) {
    showNotification('正在处理图片...', 'info');
    
    convertImageToBase64(file)
        .then(base64 => {
            insertImageIntoMarkdown(base64, file.name);
            showNotification('图片插入成功！', 'success');
        })
        .catch(error => {
            console.error('图片处理失败:', error);
            showNotification('图片处理失败，请重试', 'error');
        });
}

function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function(error) {
            reject(error);
        };
        reader.readAsDataURL(file);
    });
}

function insertImageIntoMarkdown(base64, filename) {
    const textarea = markdownInput;
    const cursorPos = textarea.selectionStart;
    const beforeText = textarea.value.substring(0, cursorPos);
    const afterText = textarea.value.substring(cursorPos);
    
    // 创建简化的图片Markdown语法用于显示（截断base64）
    const base64Header = base64.split(',')[0] + ','; // 保留data:image/xxx;base64,部分
    const base64Data = base64.split(',')[1]; // 获取实际的base64数据
    const shortBase64 = base64Header + base64Data.substring(0, 50) + '...'; // 只显示前50个字符
    
    const imageMarkdown = `\n![${filename}](${shortBase64})\n`;
    
    // 存储完整的图片数据供预览和导出使用
    storeImageData(shortBase64, base64);
    
    // 插入到光标位置
    textarea.value = beforeText + imageMarkdown + afterText;
    textarea.setSelectionRange(cursorPos + imageMarkdown.length, cursorPos + imageMarkdown.length);
    textarea.focus();
    updatePreview();
}

// 存储图片数据映射
function storeImageData(shortBase64, fullBase64) {
    imageDataStore.set(shortBase64, fullBase64);
}

// 替换预览中的简化base64为完整base64
function replaceImageDataForPreview(content) {
    let result = content;
    imageDataStore.forEach((fullBase64, shortBase64) => {
        result = result.replace(new RegExp(escapeRegExp(shortBase64), 'g'), fullBase64);
    });
    return result;
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 生成格式化的时间戳字符串 (YYYYMMDDHHMMSS)
function getFormattedTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// 获取当前配置（便于调试与外部接入）
function getCurrentMadopicConfig() {
    return {
        width: currentWidth,
        padding: currentPadding,
        fontSize: currentFontSize,
        background: markdownPoster.style.background,
        exportScale: EXPORT_SCALE
    };
}

// 导出全局对象供调试使用
window.MadopicApp = {
    updatePreview,
    exportToPNG,
    applyBackground,
    MarkdownHelper,
    showNotification,
    insertImage,
    handleImageFile,
    getCurrentMadopicConfig
};

/**
 * 裁剪画布四周完全透明的像素，去除导出后可能出现的空白边缘。
 * 返回新的裁剪画布；若无需裁剪则返回 null。
 */
function trimTransparentEdges(sourceCanvas) {
    const ctx = sourceCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let top = 0;
    let bottom = height - 1;
    let left = 0;
    let right = width - 1;
    const isRowTransparent = (y) => {
        const base = y * width * 4;
        for (let x = 0; x < width; x++) {
            if (data[base + x * 4 + 3] !== 0) return false;
        }
        return true;
    };
    const isColTransparent = (x, t, b) => {
        for (let y = t; y <= b; y++) {
            const idx = (y * width + x) * 4 + 3;
            if (data[idx] !== 0) return false;
        }
        return true;
    };

    while (top <= bottom && isRowTransparent(top)) top++;
    while (bottom >= top && isRowTransparent(bottom)) bottom--;
    while (left <= right && isColTransparent(left, top, bottom)) left++;
    while (right >= left && isColTransparent(right, top, bottom)) right--;

    // 若全透明或无需要裁剪
    if (top === 0 && left === 0 && right === width - 1 && bottom === height - 1) return null;
    if (top > bottom || left > right) return null;

    const newWidth = right - left + 1;
    const newHeight = bottom - top + 1;
    const trimmed = document.createElement('canvas');
    trimmed.width = newWidth;
    trimmed.height = newHeight;
    const tctx = trimmed.getContext('2d');
    tctx.drawImage(sourceCanvas, left, top, newWidth, newHeight, 0, 0, newWidth, newHeight);
    return trimmed;
}
