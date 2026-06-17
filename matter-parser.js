function parseMatter(matter) {
  const result = {
    header: '',
    title: '',
    body: '',
    level: '',
    presenter: '',
    institutions: [],
    year: '',
    tagline: '',
    lines: [],
    raw: matter.trim(),
  };

  const lines = matter.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return result;

  const labelMap = {
    'header': 'header',
    'institution': 'header',
    'institutions': 'institutions',
    'award title': 'title',
    'title': 'title',
    'body': 'body',
    'citation': 'body',
    'message': 'body',
    'event level': 'level',
    'level': 'level',
    'presenter': 'presenter',
    'sanmankarta': 'presenter',
    'सन्मानकर्ता': 'presenter',
    'year': 'year',
    'tagline': 'tagline',
  };

  let currentField = null;

  for (const line of lines) {
    const labelMatch = line.match(/^([^:]+):\s*(.*)$/);
    if (labelMatch) {
      const key = labelMatch[1].trim().toLowerCase();
      const value = labelMatch[2].trim();
      const field = labelMap[key];

      if (field === 'institutions') {
        currentField = 'institutions';
        if (value) result.institutions.push(value);
        continue;
      }

      if (field) {
        currentField = field;
        if (value) result[field] = value;
        continue;
      }
    }

    if (currentField === 'institutions') {
      result.institutions.push(line);
    } else if (currentField === 'body') {
      result.body += (result.body ? '\n' : '') + line;
    } else if (currentField && result[currentField] !== undefined) {
      result[currentField] += (result[currentField] ? '\n' : '') + line;
    } else {
      result.lines.push(line);
    }
  }

  if (result.lines.length) {
    assignUnlabeledLines(result);
  }

  if (!result.presenter && result.institutions.length) {
    result.presenter = result.institutions.join(', ');
  }

  result.institutions = result.institutions.filter(Boolean);
  return result;
}

function assignUnlabeledLines(result) {
  const yearRe = /^(\d{4}|[०-९]{4})$/;
  const remaining = [];

  for (const line of result.lines) {
    if (!result.year && yearRe.test(line)) {
      result.year = line;
    } else if (!result.header) {
      result.header = line;
    } else if (!result.title) {
      result.title = line;
    } else if (!result.body) {
      result.body = line;
    } else if (!result.presenter && line.length < 60) {
      result.presenter = line;
    } else {
      remaining.push(line);
    }
  }

  if (remaining.length && !result.body.includes('\n')) {
    result.body = [result.body, ...remaining.slice(0, -1)].filter(Boolean).join('\n');
    if (!result.presenter && remaining.length) {
      result.presenter = remaining[remaining.length - 1];
    }
  }
}

module.exports = { parseMatter };
