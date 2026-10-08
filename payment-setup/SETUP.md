# Kích hoạt thanh toán Social To Sale

Website đã sẵn sàng nhận mã STS và số tiền từ Apps Script. Trước khi thay Apps Script, website vẫn tương thích với bản LPWS đang chạy; việc push Git không cập nhật Apps Script.

1. Trong dự án Apps Script riêng của Social To Sale, sao lưu code hiện tại rồi thay toàn bộ bằng `Code.gs` trong thư mục này. Không tạo thêm file có các hàm trùng tên.
2. Vào Project Settings → Script Properties, thêm `SHEET_ID` (ID của Sheet Social To Sale hiện tại) và `BANK_ACCOUNT` (số tài khoản MBBank nhận tiền, giữ số 0 đầu). Chạy `setupWebhook` từ trình biên tập và cấp quyền. Hàm tạo khóa riêng trong Script Properties và ghi URL webhook vào Execution log. URL này có `?key=...`: chỉ dán vào SePay, không gửi vào chat, Git hoặc website.
3. Deploy → Manage deployments → chọn Web app hiện tại → Edit → New version → Deploy. Giữ URL /exec hiện tại; chạy dưới tài khoản chủ sở hữu, cho phép Anyone truy cập. Nếu Google yêu cầu cấp quyền bổ sung, hoàn tất cấp quyền.
4. Mở URL /exec hiện tại với `?action=health`. Phải trả `{"ok":true,"version":"sts-v1"}`. Không mở URL trống để thử đăng ký.
5. Trong webhook socialtosale: thay URL bằng URL riêng có khóa ở bước 2; chọn chỉ tài khoản MBBank nhận tiền khớp BANK_ACCOUNT, Tiền vào, Dùng để xác thực thanh toán. Để phương thức xác thực header là Không xác thực vì Apps Script kiểm tra khóa trong URL; đây là khóa bí mật thực sự, không phải endpoint mở như script cũ.
6. Trong cấu hình mã thanh toán SePay: tiền tố `STS`, hậu tố **8 ký tự chữ và số**. Chọn bộ lọc STS cho webhook này. Tắt webhook workshop cũ nếu không còn dùng.
7. Tạo một đăng ký mới. Sheet phải có mã STS + 8 ký tự và số tiền ở cột H; QR phải có cùng mã và số tiền. Không chuyển khoản thêm chỉ để kiểm tra trước khi hai bước này đúng.
8. Khi có thanh toán thật, xem nhật ký SePay và Sheet. Phản hồi thành công là `{"success":true}`; Sheet ghi ID giao dịch, số tiền nhận, thời gian xác nhận. Gửi lại cùng giao dịch không ghi nhận hai lần. Số tiền phải khớp chính xác; thiếu/thừa tiền cần đối soát thủ công.

## Những điểm cần biết

- Dữ liệu cũ giữ nguyên; các đơn LPWS cũ không được script mới tự xác nhận. Khoản đã chuyển thử cần đối soát với ngân hàng/SePay theo mã cũ, không tự đổi mã hoặc đánh dấu đã trả tiền.
- Giá hiện tại theo form: Standard 6.800.000, Premium 11.390.000, Private chờ tư vấn. Mã nguoinha giảm 40% Standard / 30% Premium; referral giảm 10%. Backend tự tính, không tin số tiền gửi từ trình duyệt.
- Danh sách referral giữ các mã sẵn có và tra thêm CSV công khai đang dùng. Nếu thay chính sách giá, cập nhật cả website lẫn `price_` rồi triển khai Apps Script bản mới.
- Script không gửi email xác nhận. Màn hình thành công không nên được hiểu là email đã được gửi.
- Apps Script ContentService có chuyển hướng khi trả kết quả. Nếu nhật ký SePay báo 302/redirect hoặc không đọc được JSON, giữ lại mã lỗi để chuyển webhook sang endpoint Vercel có xác thực và chuyển tiếp. Chưa xem nhật ký thật thì không thể khẳng định tích hợp đầu cuối đã hoạt động.
- Không dùng nút gửi thử với nội dung của một đơn thật và số tiền thật: payload thử không phải bằng chứng chuyển tiền. Script từ chối transaction id 0; việc kiểm thử logic chạy riêng bằng file test, không sửa Sheet thật.

Tài liệu: https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook
Apps Script: https://developers.google.com/apps-script/guides/web
