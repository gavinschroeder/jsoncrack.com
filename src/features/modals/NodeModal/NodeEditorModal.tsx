import React from "react";
import { Stack, Flex, Button, Group, TextInput, Text } from "@mantine/core";
import toast from "react-hot-toast";
import styled from "styled-components";
import type { NodeData, NodeRow } from "../../../types/graph";

const FieldsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 420px;
  overflow-y: auto;
  padding: 8px;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 8px;
  align-items: center;
`;

type EditableField = {
  key: string;
  value: string;
  type: string;
  originalKey: string | null;
};

type Props = {
  opened: boolean;
  onClose: () => void;
  onSave: (newValue: any) => void;
  nodeData?: NodeData | null;
};

const NodeEditorModal: React.FC<Props> = ({ opened, onClose, onSave, nodeData }) => {
  const [fields, setFields] = React.useState<EditableField[]>([]);
  const [originalFields, setOriginalFields] = React.useState<EditableField[]>([]);
  const [isSingleValue, setIsSingleValue] = React.useState(false);

  React.useEffect(() => {
    if (!nodeData || !nodeData.text) {
      setFields([]);
      setOriginalFields([]);
      setIsSingleValue(false);
      return;
    }

    // Check if this is a single primitive value (no key)
    if (nodeData.text.length === 1 && !nodeData.text[0].key) {
      const singleField: EditableField = {
        key: "",
        value: String(nodeData.text[0].value ?? ""),
        type: nodeData.text[0].type,
        originalKey: null,
      };
      setFields([singleField]);
      setOriginalFields([singleField]);
      setIsSingleValue(true);
      return;
    }

    // Build editable fields from node rows (only non-nested primitives)
    const editableFields: EditableField[] = nodeData.text
      .filter(row => row.type !== "array" && row.type !== "object")
      .map(row => ({
        key: row.key ?? "",
        value: String(row.value ?? ""),
        type: row.type,
        originalKey: row.key,
      }));

    setFields(editableFields);
    setOriginalFields(editableFields);
    setIsSingleValue(false);
  }, [nodeData, opened]);

  const handleFieldChange = (index: number, field: "key" | "value", newValue: string) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [field]: newValue };
    setFields(updated);
  };

  const parseValue = (value: string, type: string): any => {
    const trimmed = value.trim();

    // Handle explicit type conversions based on original type
    if (type === "null" || trimmed === "null") return null;
    if (type === "boolean" || trimmed === "true" || trimmed === "false") {
      return trimmed === "true";
    }
    if (type === "number") {
      const num = Number(trimmed);
      return isNaN(num) ? trimmed : num;
    }

    // Try to parse as JSON first
    try {
      return JSON.parse(trimmed);
    } catch {
      // Return as string if parsing fails
      return trimmed;
    }
  };

  const handleSave = () => {
    if (!nodeData) {
      onClose();
      return;
    }

    try {
      let newValue: any;

      if (isSingleValue) {
        // Single primitive value node
        newValue = parseValue(fields[0].value, fields[0].type);
      } else {
        // Object with key-value pairs
        newValue = {};
        fields.forEach(field => {
          if (field.key.trim()) {
            newValue[field.key.trim()] = parseValue(field.value, field.type);
          }
        });
      }

      // Call parent's save handler
      onSave(newValue);
    } catch (err) {
      console.error(err);
      toast.error("Invalid input");
    }
  };

  const handleCancel = () => {
    // Restore original fields
    setFields(originalFields);
    onClose();
  };

  return (
    <Stack gap="sm">
      <Flex justify="flex-end" align="center">
        <Group spacing="xs">
          <Button size="xs" variant="default" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="xs" onClick={handleSave}>
            Save
          </Button>
        </Group>
      </Flex>

      <FieldsContainer>
        {isSingleValue ? (
          <FieldRow>
            <Text size="sm" c="dimmed">
              Value:
            </Text>
            <TextInput
              value={fields[0]?.value ?? ""}
              onChange={e => handleFieldChange(0, "value", e.currentTarget.value)}
              placeholder="Enter value"
              size="sm"
            />
            <Text size="xs" c="dimmed">
              {fields[0]?.type}
            </Text>
          </FieldRow>
        ) : fields.length > 0 ? (
          fields.map((field, index) => (
            <FieldRow key={index}>
              <TextInput
                value={field.key}
                onChange={e => handleFieldChange(index, "key", e.currentTarget.value)}
                placeholder="Key"
                size="sm"
                disabled={field.originalKey !== null} // Don't allow editing original keys
                styles={field.originalKey !== null ? { input: { opacity: 0.7 } } : undefined}
              />
              <TextInput
                value={field.value}
                onChange={e => handleFieldChange(index, "value", e.currentTarget.value)}
                placeholder="Value"
                size="sm"
              />
              <Text size="xs" c="dimmed" style={{ minWidth: 60 }}>
                {field.type}
              </Text>
            </FieldRow>
          ))
        ) : (
          <Text size="sm" c="dimmed" ta="center">
            No editable fields (nested objects/arrays not supported)
          </Text>
        )}
      </FieldsContainer>
    </Stack>
  );
};

export default NodeEditorModal;