import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  ScrollArea,
  Flex,
  CloseButton,
  Button,
  Group,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useFile from "../../../store/useFile";
import useJson from "../../../store/useJson";
import toast from "react-hot-toast";
import styled from "styled-components";
import NodeEditorModal from "./NodeEditorModal";

const EditorWrap = styled.div`
  min-height: 200px;
  max-height: 420px;
`;

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj: Record<string, any> = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

function deepClone(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

/** Writes a value into a JSON object at path array (exact copy from GraphView/NodeModal.tsx) */
function setByPath(root: any, path: (string | number)[], value: any) {
  if (!path || path.length === 0) return value;

  const newRoot = deepClone(root);
  let cursor = newRoot;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (cursor[key] === undefined) {
      cursor[key] = typeof path[i + 1] === "number" ? [] : {};
    }
    cursor = cursor[key];
  }

  cursor[path[path.length - 1]] = value;
  return newRoot;
}

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const setSelectedNode = useGraph(state => state.setSelectedNode);
  const fileData = useFile(state => state.fileData);
  const contents = useFile(state => state.contents);
  const setContents = useFile(state => state.setContents);

  const [editing, setEditing] = React.useState(false);

  const handleClose = () => {
    setEditing(false);
    onClose?.();
    if (setSelectedNode) setSelectedNode(null);
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSaveFromEditor = (newValue: any) => {
    if (!nodeData) {
      handleClose();
      return;
    }

    try {
      // derive root object (exact same as GraphView/NodeModal)
      let root = fileData;
      if (!root) {
        try {
          root = JSON.parse(contents || "{}");
        } catch {
          root = {};
        }
      }

      const path = nodeData.path ?? [];
      const updated = setByPath(root, path, newValue);
      const updatedJson = JSON.stringify(updated, null, 2);

      // Update the live editor contents directly - this triggers the same pipeline as typing in the editor
      setContents({ contents: updatedJson, hasChanges: true, skipUpdate: false });

      // Force immediate graph update (bypasses 400ms debounce)
      useJson.getState().setJson(updatedJson);

      toast.success("Node updated");
      setEditing(false);
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Unable to update node");
    }
  };

  return (
    <Modal size="auto" opened={opened} onClose={handleClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>

            {!editing && (
              <Group spacing="xs">
                <Button size="xs" variant="default" onClick={handleEdit}>
                  Edit
                </Button>
                <CloseButton onClick={handleClose} />
              </Group>
            )}
          </Flex>

          <ScrollArea.Autosize mah={250} maw={600}>
            {editing ? (
              <NodeEditorModal
                opened={editing}
                onClose={handleCancel}
                onSave={handleSaveFromEditor}
                nodeData={nodeData}
              />
            ) : (
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            )}
          </ScrollArea.Autosize>
        </Stack>

        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
