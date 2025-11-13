import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { Modal, Stack, Text, Button, Group, Textarea } from "@mantine/core";
import toast from "react-hot-toast";
import styled from "styled-components";
import useModal from "../../../../../store/useModal";
import useGraph from "../stores/useGraph";
import useFile from "../../../../../store/useFile";

const EditorWrapper = styled.div`
  height: 320px;
  margin-top: 8px;
`;

function parsePathToArray(path: any): string[] {
  if (!path && path !== 0) return [];
  if (Array.isArray(path)) return path.map(String);
  return String(path).split(/[\.\[\]]+/).filter(Boolean);
}

function deepClone(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

/** Writes a value into a JSON object at path array */
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

const NodeModal: React.FC = () => {
  const visible = useModal(state => state.visible.NodeModal);
  const setVisible = useModal(state => state.setVisible);
  const selectedNode = useGraph(state => state.selectedNode);
  const setSelectedNode = useGraph(state => s.setSelectedNode);
  const fileData = useFile(state => state.fileData);
  const contents = useFile(state => state.contents);
  const setContents = useFile(state => state.setContents);

  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState<string>("");

  React.useEffect(() => {
    if (!selectedNode) {
      setText("");
      setEditing(false);
      return;
    }
    try {
      const val = (selectedNode as any).value ?? (selectedNode as any).text ?? selectedNode;
      setText(typeof val === "string" ? val : JSON.stringify(val, null, 2));
    } catch {
      setText(String((selectedNode as any).value ?? ""));
    }
  }, [selectedNode]);

  const close = () => {
    setEditing(false);
    setVisible("NodeModal", false);
    if (setSelectedNode) setSelectedNode(null);
  };

  const handleSave = () => {
    if (!selectedNode) return close();

    let newValue: any;
    try {
      newValue = JSON.parse(text);
    } catch {
      const trimmed = text.trim();
      if (trimmed === "null") newValue = null;
      else if (trimmed === "true") newValue = true;
      else if (trimmed === "false") newValue = false;
      else if (!Number.isNaN(Number(trimmed)) && trimmed !== "") newValue = Number(trimmed);
      else newValue = text;
    }

    try {
      // derive root object
      let root = fileData;
      if (!root) {
        try {
          root = JSON.parse(contents || "{}");
        } catch {
          root = {};
        }
      }

      const path = (selectedNode as any).path ?? (selectedNode as any).fullPath ?? [];
      const updated = setByPath(root, path, newValue);
      setContents({ contents: JSON.stringify(updated, null, 2), hasChanges: true });
      toast.success("Node updated");
    } catch (err) {
      console.error(err);
      toast.error("Unable to update node");
    } finally {
      close();
    }
  };

  if (!visible) return null;

  const pathDisplay = (selectedNode && ((selectedNode as any).path || (selectedNode as any).fullPath || "")) ?? "";

  return (
    <Modal opened={!!visible} onClose={close} title="Node" centered size="lg">
      <Text size="xs" c="dimmed">
        Path: {typeof pathDisplay === "string" ? pathDisplay : JSON.stringify(pathDisplay)}
      </Text>

      {!editing ? (
        <>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", marginTop: 8 }}>
            {text}
          </pre>
          <Group position="right" mt="md">
            <Button size="xs" variant="default" onClick={close}>
              Close
            </Button>
            <Button size="xs" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </Group>
        </>
      ) : (
        <>
          <EditorWrapper>
            <Editor
              language="json"
              value={text}
              onChange={v => setText(v ?? "")}
              options={{ minimap: { enabled: false }, formatOnPaste: true, tabSize: 2 }}
              onMount={editor => {
                try { editor.getAction("editor.action.formatDocument")?.run(); } catch {}
              }}
            />
          </EditorWrapper>

          <Group position="right" mt="sm">
            <Button
              size="xs"
              variant="default"
              onClick={() => {
                // Cancel: restore original and close modal
                try {
                  const val = (selectedNode as any).value ?? (selectedNode as any).text ?? selectedNode;
                  setText(typeof val === "string" ? val : JSON.stringify(val, null, 2));
                } catch {}
                setEditing(false);
                close();
              }}
            >
              Cancel
            </Button>
            <Button size="xs" onClick={handleSave}>
              Save
            </Button>
          </Group>
        </>
      )}
    </Modal>
  );
};

export default NodeModal;

