// // ฟังก์ชันหลักในการป้องกันการจับภาพหน้าจอ
// function preventScreenCapture() {
//     // ป้องกันการใช้งาน getDisplayMedia
//     navigator.mediaDevices.getDisplayMedia = function() {
//         showAlert("ไม่สามารถจับภาพหน้าจอได้! การจับภาพหน้าจอถูกตรวจพบ!");
//         return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
//     };

//     // ป้องกันการใช้งาน getUserMedia
//     if (navigator.getUserMedia) {
//         navigator.getUserMedia = function() {
//             showAlert("ไม่สามารถจับภาพหน้าจอได้! การจับภาพหน้าจอถูกตรวจพบ!");
//             return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
//         };
//     }

//     // ป้องกันการใช้งาน PrintScreen และ F12 พร้อมแจ้งเตือน
//     document.addEventListener('keyup', function(event) {
//         console.log('Key pressed:', event.key); // บันทึกการกดปุ่มลงใน Console
//         if (event.key === "PrintScreen" || event.key === "F12") {
//             showAlert('การจับภาพหน้าจอถูกจำกัด! การจับภาพหน้าจอถูกตรวจพบ!');
//             console.log('Screen capture attempt detected!');
//             event.preventDefault();
//         }
//     });
    

//     // ตรวจจับการใช้งาน screen capture ของ third-party logger พร้อมแจ้งเตือน
//     window.addEventListener('beforeprint', function(event) {
//         showAlert('การพิมพ์หรือจับภาพหน้าจอไม่สามารถใช้งานได้! การจับภาพหน้าจอถูกตรวจพบ!');
//         console.log('Screen capture attempt detected!');
//         event.preventDefault();
//     });

//     // ตรวจจับการใช้ screen.capture ของ third-party logger พร้อมแจ้งเตือน
//     if (navigator.mediaDevices) {
//         navigator.mediaDevices.getUserMedia = function(constraints) {
//             if (constraints && constraints.video && constraints.video.mediaSource === 'screen') {
//                 showAlert("ไม่สามารถจับภาพหน้าจอได้! การจับภาพหน้าจอถูกตรวจพบ!");
//                 console.log('Screen capture attempt detected!');
//                 return Promise.reject("การจับภาพหน้าจอถูกป้องกัน");
//             }
//             return navigator.mediaDevices.getUserMedia(constraints);
//         };
//     }
// }

// // ฟังก์ชันเพื่อแสดงการแจ้งเตือนในรูปแบบ modal
// function showAlert(message) {
//     const modal = document.createElement('div');
//     modal.style.position = 'fixed';
//     modal.style.zIndex = '10000';
//     modal.style.left = '50%';
//     modal.style.top = '50%';
//     modal.style.transform = 'translate(-50%, -50%)';
//     modal.style.backgroundColor = 'white';
//     modal.style.padding = '20px';
//     modal.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.5)';
    
//     const text = document.createElement('p');
//     text.textContent = message;
//     modal.appendChild(text);
    
//     const button = document.createElement('button');
//     button.textContent = 'Close';
//     button.onclick = function() {
//         document.body.removeChild(modal);
//     };
//     modal.appendChild(button);
    
//     document.body.appendChild(modal);
// }

// // เรียกใช้งานฟังก์ชันเพื่อป้องกันการจับภาพหน้าจอ
// preventScreenCapture();

