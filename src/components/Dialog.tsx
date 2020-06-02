import React from "react";
import { DialogData } from "../utils/types";

interface DialogProps extends DialogData {
  onClose: () => {}
}

export default function Dialog({
  message = "default message",
  okText = "ok",
  cancelText = "cancel",
  okClass = "ok",
  onClose = () => {},
  onOk = () => {},
  onCancel = () => {},
}) {
  function handleOkClick() {
    onOk();
    onClose();
  }
  function handleCancelClick() {
    onCancel();
    onClose();
  }
  return (
    <div className="dialog-container">
      <div className="bg-white border-2 border-main rounded p-4">
        <div className="my-2 text-lg">{message}</div>
        <div className="flex space-x-2">
          <button className="btn btn-neutral" onClick={handleCancelClick}>
            {cancelText}
          </button>
          <button className={"btn btn-" + okClass} onClick={handleOkClick}>
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}
