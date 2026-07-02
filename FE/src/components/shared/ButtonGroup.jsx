export default function ButtonGroup({
  onSave,
  onCancel,
  saveLabel = 'Lưu',
  cancelLabel = 'Hủy',
  saveLoading = false,
  saveDisabled = false,
  variant = 'default', // 'default' | 'outline'
}) {
  return (
    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
      <button
        type="button"
        onClick={onCancel}
        className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        onClick={onSave}
        disabled={saveDisabled || saveLoading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
      >
        {saveLoading ? 'Đang lưu...' : saveLabel}
      </button>
    </div>
  )
}