import { ButtonBase, Stack, Typography, alpha } from "@mui/material";

const SIZES = {
  lg: { minWidth: 200, minHeight: 140, padding: 3, labelVariant: "h5" },
  md: { minWidth: 150, minHeight: 100, padding: 2, labelVariant: "h6" },
};

const TileButton = ({
  label,
  subtitle,
  selected = false,
  disabled = false,
  accentColor,
  onClick,
  size = "lg",
}) => {
  const { minWidth, minHeight, padding, labelVariant } = SIZES[size] ?? SIZES.lg;

  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      focusRipple
      sx={{
        flex: 1,
        minWidth,
        minHeight,
        p: padding,
        borderRadius: 3,
        border: "2px solid",
        borderColor: selected ? accentColor : "divider",
        backgroundColor: selected
          ? alpha(accentColor || "#000", 0.12)
          : "background.paper",
        transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease",
        boxShadow: selected ? `0 6px 18px ${alpha(accentColor || "#000", 0.18)}` : "none",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        "&:hover": disabled
          ? {}
          : {
              transform: "translateY(-2px)",
              boxShadow: `0 8px 22px ${alpha(accentColor || "#000", selected ? 0.24 : 0.12)}`,
              borderColor: accentColor,
            },
        "&:focus-visible": {
          outline: "none",
          boxShadow: `0 0 0 3px ${alpha(accentColor || "#1976d2", 0.45)}`,
        },
      }}
    >
      <Stack spacing={0.5} alignItems="center" justifyContent="center" sx={{ width: "100%" }}>
        <Typography
          variant={labelVariant}
          sx={{
            fontWeight: 600,
            color: selected ? accentColor : "text.primary",
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
        {subtitle ? (
          <Typography
            variant="caption"
            sx={{
              color: selected ? accentColor : "text.secondary",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontWeight: 500,
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
    </ButtonBase>
  );
};

export default TileButton;
