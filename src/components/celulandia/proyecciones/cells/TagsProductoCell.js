import React from "react";
import { Chip, Stack } from "@mui/material";

const normalizeTags = (tagsValue) => {
  let tagsArray = [];
  if (Array.isArray(tagsValue)) tagsArray = tagsValue;
  else if (typeof tagsValue === "string" && tagsValue.trim() !== "") tagsArray = [tagsValue];

  return tagsArray
    .map((tag) => {
      if (!tag) return null;
      if (typeof tag === "string") return tag;
      return typeof tag === "object" && tag.nombre ? tag.nombre : null;
    })
    .filter(Boolean);
};

const getTagColor = (tag) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  const s = 75 + (hash % 10);
  const l = 85 + (hash % 5);
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const TagsProductoCell = ({ tags, rowId }) => {
  const normalized = normalizeTags(tags);
  if (normalized.length === 0) return "-";

  return (
    <Stack direction="row" spacing={0.3} sx={{ flexWrap: "wrap", gap: 0.3 }}>
      {normalized.map((tag, idx) => (
        <Chip
          key={`${rowId ?? "row"}-tag-${idx}-${tag}`}
          label={tag}
          size="small"
          sx={{
            backgroundColor: getTagColor(tag),
            color: "text.primary",
            fontWeight: 500,
            fontSize: "0.65rem",
            height: "20px",
            "& .MuiChip-label": { px: 0.75 },
          }}
        />
      ))}
    </Stack>
  );
};

export default TagsProductoCell;
