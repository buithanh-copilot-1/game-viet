# Kế Hoạch Sửa & Thiết Kế Lại — Ma Trận Lập Phương

## Mô Tả Vấn Đề

Game Ma Trận Lập Phương là puzzle lăn khối hộp chữ nhật 1×1×2 qua một mê cung ô gạch isometric.
Hiện tại có **3 lỗi gốc rễ** về mặt hình ảnh:

| # | Lỗi | Nguyên nhân |
|---|-----|-------------|
| 1 | Nền (floor) không phẳng trên 1 mặt phẳng | `perspective` đặt sai — trực tiếp trên `.matrix-board-3d` thay vì element cha |
| 2 | Khối lập phương không nằm trên gạch | `cube-container` dùng `translateZ` chưa đúng; pivot cube đặt ở góc 0,0 thay vì tâm khối |
| 3 | Geometry 6 mặt sai | Face front/back render 32×32 nhưng khối đứng thẳng cao 64px → mặt không khép kín |

---

## Phân Tích Kỹ Thuật

### A. Cấu trúc 3D hiện tại (SAI)

```
.matrix-3d-scene          ← perspective: 800px ← không có tác dụng ở đây
  └─ .matrix-board-3d     ← rotateX(55) rotateZ(-45) + preserve-3d
       ├─ .matrix-tile    ← translateZ(0) + box-shadow fake depth
       └─ .cube-container ← translateZ(32px) ← pivot ở góc, không phải tâm
            └─ .cube-3d   ← rotateX() rotateY()
                 ├─ face-front  32×32  ← SAI (phải 32×64)
                 ├─ face-back   32×32  ← SAI
                 ├─ face-left   32×64  ← đúng
                 ├─ face-right  32×64  ← đúng
                 ├─ face-top    32×64  ← SAI (top phải 32×32)
                 └─ face-bottom 32×64  ← SAI
```

### B. Toán học đúng cho khối 1×1×2

Tile size = **40px**. Cube footprint = **32px × 32px** (margin 4px mỗi bên).

**Khi đứng thẳng (vertical)** — W=32, D=32, H=64

| Face   | Width | Height | Transform |
|--------|-------|--------|-----------|
| front  | 32    | 64     | `rotateY(0deg) translateZ(16px)` |
| back   | 32    | 64     | `rotateY(180deg) translateZ(16px)` |
| left   | 32    | 64     | `rotateY(-90deg) translateZ(16px)` |
| right  | 32    | 64     | `rotateY(90deg) translateZ(16px)` |
| top    | 32    | 32     | `rotateX(-90deg) translateZ(32px)` |
| bottom | 32    | 32     | `rotateX(90deg) translateZ(32px)` |

- Pivot `cube-3d`: `left = -16px, top = -32px` (tâm = trung tâm khối)
- Container `translateZ = +32` (để đáy khối chạm Z=0)

**Khi nằm ngang theo X (horizontal-x)** — W=64, D=32, H=32

- Pivot: `left = -32px, top = -16px`
- Container `translateZ = +16`

**Khi nằm ngang theo Y (horizontal-y)** — W=32, D=64, H=32

- Pivot: `left = -16px, top = -32px`
- Container `translateZ = +16`

### C. Perspective phải đặt trên element cha

```html
<!-- ĐÚNG -->
<div class="matrix-board-wrapper">      ← perspective: 900px ở đây
  <div class="matrix-board-3d">         ← rotateX(50) rotateZ(-45), preserve-3d
    <div class="matrix-tile" />
    <div class="cube-container-3d" />
  </div>
</div>
```

---

## Các Thay Đổi Cần Thực Hiện

### 1. CSS — `src/index.css`

| Thay đổi | Trạng thái |
|----------|-----------|
| Thêm `.matrix-board-wrapper` với `perspective: 900px` | ✅ Xong |
| Bỏ `perspective` khỏi `.matrix-3d-scene` | ✅ Xong |
| Đổi `overflow: hidden` → `overflow: visible` | ✅ Xong |
| Cải thiện `box-shadow` tiles để fake depth | ✅ Xong |
| Xóa `.face-*` transform class cũ (sai) | ✅ Xong |
| Rewrite `.cube-face` base styles, bỏ kích thước cứng | ✅ Xong |

### 2. JSX — `src/games/ma-tran/MaTran.jsx`

| Thay đổi | Trạng thái |
|----------|-----------|
| Bọc board trong `<div className="matrix-board-wrapper">` | ✅ Xong |
| Tính `cubeW / cubeD / cubeH` theo `state` | ✅ Xong |
| Render 6 mặt với đúng kích thước + transform tính từ state | ✅ Xong |
| Shadow kích thước đúng, `translateZ(0)` nằm sát gạch | ✅ Xong |

---

## Thứ Tự Thực Hiện

- [x] Bước 1 — Rewrite CSS (perspective, wrapper, face styles)
- [x] Bước 2 — JSX: bọc board trong `matrix-board-wrapper`
- [x] Bước 3 — JSX: tính kích thước cube theo state
- [x] Bước 4 — JSX: render 6 mặt đúng geometry
- [x] Bước 5 — JSX: sửa shadow
- [x] Bước 6 — Build + kiểm tra compile (npm run build ✓ pass)
- [ ] Bước 7 — Kiểm tra trực quan browser (cần bạn chạy `npm run dev` và xem)

---

## Tiêu Chí Xác Minh

1. Tất cả tiles nằm phẳng trên cùng 1 mặt phẳng (không tile nào lơ lửng hay nhô lên)
2. Khối **đứng thẳng** trông rõ ràng là hình chữ nhật 1×2 (cao gấp đôi rộng)
3. Khối **nằm ngang** trông dẹt, nằm sát mặt gạch
4. Không khoảng hở hay overlap giữa đáy cube và mặt tile
5. Di chuyển mượt mà, không artifacts

```bash
# Kiểm tra build
npm run build
```
