// GST State Code Mapping - Official Indian GST State/UT Codes
// This mapping is fixed and won't change

export const STATE_CODES = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu",
    "27": "Maharashtra",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "97": "Other Territory"
};

// Create reverse mapping for state name to code lookup
export const STATE_NAME_TO_CODE = Object.fromEntries(
    Object.entries(STATE_CODES).map(([code, name]) => [name.toLowerCase(), code])
);

// Get state code from state name (case-insensitive)
export const getStateCodeByName = (stateName) => {
    if (!stateName) return "";
    return STATE_NAME_TO_CODE[stateName.toLowerCase()] || "";
};

// Get state name from state code
export const getStateNameByCode = (stateCode) => {
    if (!stateCode) return "";
    // Ensure code is padded with leading zero if needed
    const paddedCode = stateCode.toString().padStart(2, '0');
    return STATE_CODES[paddedCode] || "";
};
