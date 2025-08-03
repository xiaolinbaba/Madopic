// 全局变量
let currentZoom = 100;
let currentBackground = 'gradient1';

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

// 图片数据存储
const imageDataStore = new Map();

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
    markdownInput.addEventListener('input', debounce(updatePreview, 300));
    
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
    
    // 背景预设选择
    setupBackgroundPresets();
    
    // 自定义颜色输入
    setupColorInputs();
    
    // 图片处理
    setupImageHandlers();
    
    // 键盘快捷键
    setupKeyboardShortcuts();
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
    const markdownText = markdownInput.value;
    // 替换简化的base64为完整版本进行预览
    const processedMarkdown = replaceImageDataForPreview(markdownText);
    const htmlContent = marked.parse(processedMarkdown);
    posterContent.innerHTML = htmlContent;
    
    // 重新应用当前的字体大小设置
    applyFontSize(currentFontSize);
    
    // 添加淡入动画
    posterContent.style.animation = 'none';
    posterContent.offsetHeight; // 触发重排
    posterContent.style.animation = 'fadeIn 0.3s ease';
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
    currentFontSize = parseInt(document.getElementById('fontSizeSlider').value);
    applyFontSize(currentFontSize);
    
    // 应用边距设置
    currentPadding = parseInt(document.getElementById('paddingSlider').value);
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
    const style = posterContent.style;
    style.setProperty('--base-font-size', `${fontSize}px`);
    
    // 更新各级标题和文本大小
    const elements = posterContent.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, span, div, blockquote, code, pre, strong, em, a');
    elements.forEach(el => {
        // 跳过pre内的code元素，它们有自己的字体大小
        if (el.tagName.toLowerCase() === 'code' && el.closest('pre')) {
            return;
        }
        
        switch(el.tagName.toLowerCase()) {
            case 'h1':
                el.style.fontSize = `${Math.round(fontSize * 1.75)}px`;
                break;
            case 'h2':
                el.style.fontSize = `${Math.round(fontSize * 1.375)}px`;
                break;
            case 'h3':
                el.style.fontSize = `${Math.round(fontSize * 1.125)}px`;
                break;
            case 'h4':
                el.style.fontSize = `${Math.round(fontSize * 1.05)}px`;
                break;
            case 'h5':
            case 'h6':
                el.style.fontSize = `${Math.round(fontSize * 0.95)}px`;
                break;
            case 'code':
                // 行内代码稍小一些
                el.style.fontSize = `${Math.round(fontSize * 0.875)}px`;
                break;
            case 'blockquote':
                el.style.fontSize = `${Math.round(fontSize * 0.95)}px`;
                break;
            default:
                // p, li, span, div, strong, em, a 等其他元素
                el.style.fontSize = `${fontSize}px`;
                break;
        }
    });
    
    // 设置根字体大小作为备用
    posterContent.style.fontSize = `${fontSize}px`;
}

function applyPadding(padding) {
    // 调整外层容器的内边距，即图片中红色箭头指向的边距
    markdownPoster.style.padding = `${padding}px`;
}

function applyWidth(width) {
    // 调整预览区的整体宽度（导出图片的宽度）
    markdownPoster.style.maxWidth = `${width}px`;
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
        const value = this.value;
        fontSizeValue.textContent = `${value}px`;
        // 实时预览
        applyFontSize(parseInt(value));
    });
    
    // 边距滑块
    paddingSlider.addEventListener('input', function() {
        const value = this.value;
        paddingValue.textContent = `${value}px`;
        // 实时预览
        applyPadding(parseInt(value));
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

// 导出为 PNG
async function exportToPNG() {
    try {
        showNotification('正在生成图片...', 'info');
        
        // 隐藏可能影响截图的元素
        const poster = markdownPoster;
        const originalTransform = previewContent.style.transform;
        previewContent.style.transform = 'scale(1)';
        
        // 等待渲染完成
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                setTimeout(resolve, 200);
            });
        });
        
        // 使用 html2canvas 生成图片
        const canvas = await html2canvas(poster, {
            backgroundColor: null,
            scale: 2, // 高清输出
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: poster.offsetWidth,
            height: poster.offsetHeight,
            onclone: function(clonedDoc) {
                // 移除行内代码的样式，让它们看起来像普通文本
                const inlineCodes = clonedDoc.querySelectorAll('code');
                inlineCodes.forEach(code => {
                    // 检查是否在pre标签内（代码块）
                    const isInPre = code.closest('pre');
                    
                    if (!isInPre) {
                        // 移除所有行内代码的样式，使用!important强制覆盖
                        code.style.setProperty('background', 'transparent', 'important');
                        code.style.setProperty('background-color', 'transparent', 'important');
                        code.style.setProperty('padding', '0', 'important');
                        code.style.setProperty('border-radius', '0', 'important');
                        code.style.setProperty('font-family', 'inherit', 'important');
                        code.style.setProperty('font-size', 'inherit', 'important');
                        code.style.setProperty('color', 'inherit', 'important');
                        code.style.setProperty('border', 'none', 'important');
                        code.style.setProperty('box-shadow', 'none', 'important');
                    }
                });
                
                // 确保图片样式正确应用
                const images = clonedDoc.querySelectorAll('.poster-content img');
                images.forEach(img => {
                    img.style.setProperty('border-radius', '8px', 'important');
                    img.style.setProperty('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.1)', 'important');
                    img.style.setProperty('display', 'block', 'important');
                    img.style.setProperty('max-width', '100%', 'important');
                    img.style.setProperty('height', 'auto', 'important');
                    img.style.setProperty('margin', '16px 0', 'important');
                    img.style.setProperty('object-fit', 'cover', 'important');
                });
            }
        });
        
        // 恢复原始缩放
        previewContent.style.transform = originalTransform;
        
        // 下载图片
        const link = document.createElement('a');
        link.download = `madopic-${getFormattedTimestamp()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('图片导出成功！', 'success');
        
    } catch (error) {
        console.error('导出失败:', error);
        showNotification('导出失败，请重试', 'error');
    }
}

// 通知系统
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

// 键盘快捷键
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

// 工具函数：获取当前时间戳
function getCurrentTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

// 错误处理
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

// 导出全局对象供调试使用
window.MadopicApp = {
    updatePreview,
    exportToPNG,
    applyBackground,
    MarkdownHelper,
    showNotification,
    insertImage,
    handleImageFile
};