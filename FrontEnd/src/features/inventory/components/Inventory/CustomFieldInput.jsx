import React from "react";

const CustomFieldInput = ({ field, value, onChange }) => {
  return (
    <div>
      <label className="block text-sm">{field}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        required
      />
    </div>
  );
};

export default CustomFieldInput;
