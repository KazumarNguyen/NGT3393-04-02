// Cấu hình API
const API_URL = 'https://api.escuelajs.co/api/v1/products';

// State quản lý dữ liệu
let state = {
    allProducts: [],    // Dữ liệu gốc từ API
    filteredData: [],   // Dữ liệu sau khi search/sort
    currentPage: 1,
    pageSize: 5,
    sortCol: null,
    sortAsc: true
};

// --- 1. KHỞI TẠO & LẤY DỮ LIỆU ---
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        state.allProducts = data; 
        state.filteredData = [...state.allProducts];
        renderTable();
    } catch (error) {
        alert('Lỗi khi tải dữ liệu: ' + error.message);
    }
}

// --- 2. RENDER TABLE ---
function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    // Tính toán phân trang
    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageData = state.filteredData.slice(start, end);

    pageData.forEach(product => {
        // Xử lý ảnh: API trả về mảng chuỗi clean URL
        let imgUrl = "https://via.placeholder.com/50";
        if(product.images && product.images.length > 0) {
            // Fix lỗi cú pháp JSON trong chuỗi ảnh của API này nếu có
            imgUrl = product.images[0].replace(/["\[\]]/g, ''); 
        }

        const tr = document.createElement('tr');
        tr.className = 'product-row';
        // Yêu cầu: Description hiển thị khi di chuột (title attribute)
        tr.setAttribute('title', product.description || 'No description');
        tr.onclick = (e) => {
            // Ngăn sự kiện click nếu click vào icon sort (dù icon ở thead nhưng đề phòng)
            openDetailModal(product);
        };

        tr.innerHTML = `
            <td>${product.id}</td>
            <td><img src="${imgUrl}" class="product-img" alt="img"></td>
            <td>${product.title}</td>
            <td>$${product.price}</td>
            <td>${product.category ? product.category.name : 'N/A'}</td>
        `;
        tbody.appendChild(tr);
    });

    // Cập nhật thông tin trang
    const totalPages = Math.ceil(state.filteredData.length / state.pageSize);
    document.getElementById('pageInfo').innerText = `Trang ${state.currentPage} / ${totalPages} (Tổng ${state.filteredData.length} item)`;
}

// --- 3. TÌM KIẾM (OnChanged) ---
document.getElementById('searchInput').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    state.filteredData = state.allProducts.filter(p => 
        p.title.toLowerCase().includes(keyword)
    );
    state.currentPage = 1; // Reset về trang 1
    // Re-sort nếu đang sort
    if(state.sortCol) applySort();
    renderTable();
});

// --- 4. PHÂN TRANG ---
document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value);
    state.currentPage = 1;
    renderTable();
});

function changePage(direction) {
    const totalPages = Math.ceil(state.filteredData.length / state.pageSize);
    const newPage = state.currentPage + direction;
    if (newPage > 0 && newPage <= totalPages) {
        state.currentPage = newPage;
        renderTable();
    }
}

// --- 5. SẮP XẾP ---
function handleSort(column) {
    if (state.sortCol === column) {
        state.sortAsc = !state.sortAsc; // Đổi chiều
    } else {
        state.sortCol = column;
        state.sortAsc = true; // Mặc định tăng dần
    }
    applySort();
    renderTable();
}

function applySort() {
    state.filteredData.sort((a, b) => {
        let valA = a[state.sortCol];
        let valB = b[state.sortCol];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return state.sortAsc ? -1 : 1;
        if (valA > valB) return state.sortAsc ? 1 : -1;
        return 0;
    });
}

// --- 6. EXPORT CSV ---
document.getElementById('btnExport').addEventListener('click', () => {
    // 1. Tính toán vị trí cắt dữ liệu cho trang hiện tại
    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    
    // 2. Lấy dữ liệu chỉ của trang đang xem
    const dataToExport = state.filteredData.slice(start, end); 

    // Kiểm tra nếu không có dữ liệu
    if (dataToExport.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
    }

    const rows = [['ID', 'Title', 'Price', 'Category', 'Description']];
    
    // 3. Duyệt qua mảng dataToExport (thay vì state.filteredData cũ)
    dataToExport.forEach(p => {
        // Xử lý các ký tự đặc biệt để không vỡ format CSV
        const safeTitle = `"${p.title.replace(/"/g, '""')}"`;
        const safeDesc = `"${(p.description || '').replace(/"/g, '""')}"`;
        
        rows.push([
            p.id, 
            safeTitle, 
            p.price, 
            p.category ? p.category.name : '', 
            safeDesc
        ]);
    });

    // Tạo file và tải xuống
    const csvContent = "data:text/csv;charset=utf-8," 
        + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // Thêm số trang vào tên file cho dễ quản lý
    link.setAttribute("download", `products_page_${state.currentPage}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// --- 7. TẠO MỚI (CREATE) - ĐÃ SỬA ---
async function createProduct() {
    // 1. Lấy giá trị từ form
    const title = document.getElementById('createTitle').value.trim();
    const priceStr = document.getElementById('createPrice').value;
    const desc = document.getElementById('createDesc').value.trim();
    const catIdStr = document.getElementById('createCategoryId').value;
    const img = document.getElementById('createImage').value.trim();

    // 2. Validate (Kiểm tra dữ liệu trước khi gửi)
    if (!title || !priceStr || !desc || !catIdStr || !img) {
        alert("Vui lòng điền đầy đủ tất cả các trường!");
        return;
    }

    const price = parseFloat(priceStr);
    const catId = parseInt(catIdStr);

    if (isNaN(price) || price <= 0) {
        alert("Giá (Price) phải là một số dương hợp lệ!");
        return;
    }

    if (isNaN(catId)) {
        alert("Category ID phải là một số!");
        return;
    }

    // 3. Tạo payload gửi đi
    const payload = {
        title: title,
        price: price,
        description: desc,
        categoryId: catId,
        images: [img] // API yêu cầu mảng chứa chuỗi URL
    };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 4. Xử lý kết quả trả về
        if (res.ok) {
            alert('Tạo sản phẩm thành công!');
            
            // Reload lại data
            fetchData(); 
            
            // Đóng modal
            const modalEl = document.getElementById('createModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            // Reset form
            document.getElementById('createForm').reset();
        } else {
            // QUAN TRỌNG: Đọc lỗi chi tiết từ server gửi về
            const errorData = await res.json();
            console.error("Server Error:", errorData);
            
            // API Platzi thường trả về lỗi dạng mảng hoặc object message
            let errorMessage = "Lỗi không xác định";
            if (errorData.message) {
                errorMessage = Array.isArray(errorData.message) 
                    ? errorData.message.join(', ') 
                    : errorData.message;
            }
            alert('Tạo thất bại: ' + errorMessage);
        }
    } catch (e) {
        console.error(e);
        alert('Lỗi kết nối hoặc lỗi hệ thống!');
    }
}

// --- 8. CHI TIẾT & CẬP NHẬT (VIEW & UPDATE) ---
let currentDetailModal = null;

function openDetailModal(product) {
    // Fill data
    document.getElementById('detailId').value = product.id;
    document.getElementById('detailTitle').value = product.title;
    document.getElementById('detailPrice').value = product.price;
    document.getElementById('detailDesc').value = product.description;
    
    let imgUrl = (product.images && product.images.length) ? product.images[0].replace(/["\[\]]/g, '') : '';
    document.getElementById('detailImageDisplay').src = imgUrl;

    // Reset trạng thái: View only
    document.getElementById('detailTitle').disabled = true;
    document.getElementById('detailPrice').disabled = true;
    document.getElementById('detailDesc').disabled = true;
    
    document.getElementById('btnEnableEdit').classList.remove('d-none');
    document.getElementById('btnUpdate').classList.add('d-none');

    // Show modal
    const modalEl = document.getElementById('detailModal');
    currentDetailModal = new bootstrap.Modal(modalEl);
    currentDetailModal.show();
}

function enableEditMode() {
    document.getElementById('detailTitle').disabled = false;
    document.getElementById('detailPrice').disabled = false;
    document.getElementById('detailDesc').disabled = false;

    document.getElementById('btnEnableEdit').classList.add('d-none');
    document.getElementById('btnUpdate').classList.remove('d-none');
}

async function updateProduct() {
    const id = document.getElementById('detailId').value;
    const title = document.getElementById('detailTitle').value;
    const price = parseFloat(document.getElementById('detailPrice').value);
    const desc = document.getElementById('detailDesc').value;

    const payload = {
        title: title,
        price: price,
        description: desc
    };

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert('Cập nhật thành công!');
            currentDetailModal.hide();
            fetchData(); // Reload data
        } else {
            alert('Cập nhật thất bại (API có thể không cho phép sửa ID này)');
        }
    } catch (e) {
        alert('Lỗi kết nối');
    }
}
